using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// The ride/trip lifecycle (API_ENDPOINTS.md §5) — the spine of both the
    /// Customer and Driver flows. Persists rides through
    /// Requested → Accepted → DriverArrived → InProgress → Completed (or Cancelled),
    /// computing fares, the coupon discount, and the fare-split on completion.
    /// Matching/dispatch is simplified to nearest-online-driver lookups; the
    /// SignalR push layer (§6) is out of this slice.
    /// </summary>
    public class RideService : IRideService
    {
        private const int NearbyRadiusMeters = 7000;
        private const int CancellationFeeMinor = 5000; // ৳50 once a driver is engaged
        private const int ScheduledLeadMinutes = 15;   // a scheduled ride enters the driver feed this long before pickup

        private readonly AppDbContext _db;
        private readonly ICouponService _coupons;
        private readonly IWalletService _wallet;
        private readonly IRoutingService _routing;

        public RideService(AppDbContext db, ICouponService coupons, IWalletService wallet, IRoutingService routing)
        {
            _db = db;
            _coupons = coupons;
            _wallet = wallet;
            _routing = routing;
        }

        /// <summary>
        /// Road distance (metres) + duration (seconds) between two points, following
        /// the street network like a real ride-hailing quote. Falls back to the
        /// straight-line haversine + nominal speed if the router is unavailable.
        /// </summary>
        private async Task<(int distance, int duration)> RoadDistanceDuration(
            double fromLat, double fromLng, double toLat, double toLng)
        {
            var routed = await _routing.Route(fromLat, fromLng, toLat, toLng);
            if (routed is { } r) return (r.distanceMeters, r.durationSeconds);

            int straight = FareCalculator.DistanceMeters(fromLat, fromLng, toLat, toLng);
            return (straight, FareCalculator.DurationSeconds(straight));
        }

        // ---- Customer --------------------------------------------------------

        public async Task<FareEstimateResultDto> Estimate(RideEstimateDto dto)
        {
            var type = NormalizeType(dto.VehicleTypeId);
            var (distance, duration) = await RoadDistanceDuration(
                dto.Pickup.Lat, dto.Pickup.Lng, dto.Destination.Lat, dto.Destination.Lng);
            int fare = FareCalculator.EstimateFareMinor(type, distance, duration);

            return new FareEstimateResultDto
            {
                Currency = "BDT",
                FareEstimateMinor = fare,
                DistanceMeters = distance,
                DurationSeconds = duration,
                EtaSeconds = 300, // nominal pickup ETA; refined by live dispatch
            };
        }

        public async Task<List<NearbyVehicleDto>> NearbyVehicles(double lat, double lng, string? vehicleType)
        {
            var online = await _db.DriverProfiles.AsNoTracking()
                .Where(d => d.IsOnline && d.CurrentLat != null && d.CurrentLng != null
                            && d.VerificationStatus == VerificationStatus.Approved)
                .ToListAsync();

            // Resolve each driver's active vehicle type (defaults to Car when unknown).
            var vehicleIds = online.Where(d => d.ActiveVehicleId != null).Select(d => d.ActiveVehicleId!.Value).ToList();
            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, v => v.Type);

            var wanted = vehicleType is null ? null : NormalizeType(vehicleType);

            var result = new List<NearbyVehicleDto>();
            foreach (var d in online)
            {
                var type = d.ActiveVehicleId is Guid vid && vehicles.TryGetValue(vid, out var t) ? t : VehicleType.Car;
                if (wanted is not null && type != wanted) continue;

                int dist = FareCalculator.DistanceMeters(lat, lng, d.CurrentLat!.Value, d.CurrentLng!.Value);
                if (dist > NearbyRadiusMeters) continue;

                result.Add(new NearbyVehicleDto
                {
                    DriverId = d.UserId,
                    VehicleType = type,
                    Lat = d.CurrentLat.Value,
                    Lng = d.CurrentLng.Value,
                    DistanceMeters = dist,
                    EtaSeconds = FareCalculator.DurationSeconds(dist),
                    Rating = d.Rating,
                });
            }

            return result.OrderBy(r => r.DistanceMeters).Take(20).ToList();
        }

        public async Task<RideCreatedDto> Request(Guid customerId, RideRequestDto dto)
        {
            var type = NormalizeType(dto.VehicleTypeId);
            if (!PaymentMethodType.IsValid(dto.PaymentMethod))
                throw AppException.BadRequest($"Invalid payment method. Allowed: {string.Join(", ", PaymentMethodType.All)}.", "INVALID_PAYMENT_METHOD");

            var (distance, duration) = await RoadDistanceDuration(
                dto.Pickup.Lat, dto.Pickup.Lng, dto.Destination.Lat, dto.Destination.Lng);
            int fare = FareCalculator.EstimateFareMinor(type, distance, duration);

            int discount = 0;
            string? couponCode = null;
            if (!string.IsNullOrWhiteSpace(dto.CouponCode))
            {
                // Throws a 422 with a stable coupon code on any rule failure.
                var (coupon, computed) = await _coupons.ValidateForRide(dto.CouponCode, customerId, fare);
                discount = computed;
                couponCode = coupon.Code;
            }

            bool scheduled = dto.ScheduledFor is DateTime when && when > DateTime.UtcNow.AddMinutes(1);

            var now = DateTime.UtcNow;
            var ride = new Ride
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                VehicleTypeId = type,
                Status = scheduled ? RideStatus.Scheduled : RideStatus.Requested,
                PickupLat = dto.Pickup.Lat,
                PickupLng = dto.Pickup.Lng,
                PickupAddress = dto.Pickup.Address,
                DestLat = dto.Destination.Lat,
                DestLng = dto.Destination.Lng,
                DestAddress = dto.Destination.Address,
                DistanceMeters = distance,
                DurationSeconds = duration,
                Currency = "BDT",
                FareEstimateMinor = fare,
                DiscountMinor = discount,
                CouponCode = couponCode,
                PaymentMethod = dto.PaymentMethod,
                StartOtp = Random.Shared.Next(100000, 999999).ToString(),
                Notes = dto.Notes,
                ScheduledFor = scheduled ? dto.ScheduledFor : null,
                RequestedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _db.Rides.Add(ride);
            await _db.SaveChangesAsync();

            return new RideCreatedDto { Ride = RideMapper.ToDto(ride), StartOtp = ride.StartOtp };
        }

        public async Task<RideDto> Cancel(Guid userId, string role, Guid rideId, string? reason)
        {
            var ride = await Load(rideId);
            AuthorizeParticipant(ride, userId, role);

            if (!RideStatus.Cancellable.Contains(ride.Status))
                throw AppException.Unprocessable("RIDE_NOT_CANCELLABLE", $"A ride in '{ride.Status}' cannot be cancelled.");

            bool byDriver = ride.DriverId == userId;
            // A fee applies when the rider cancels after a driver was already engaged.
            int fee = (!byDriver && ride.Status is RideStatus.Accepted or RideStatus.DriverArrived)
                ? CancellationFeeMinor : 0;

            ride.Status = RideStatus.Cancelled;
            ride.CancelledBy = byDriver ? RideParty.Driver : RideParty.Customer;
            ride.CancelReason = reason;
            ride.CancellationFeeMinor = fee;
            ride.CancelledAt = DateTime.UtcNow;
            ride.UpdatedAt = ride.CancelledAt.Value;

            await _db.SaveChangesAsync();
            await _coupons.ReleaseRedemption(ride.Id); // no-op unless one was locked
            return RideMapper.ToDto(ride);
        }

        public async Task<RideDto> Get(Guid userId, string role, Guid rideId)
        {
            var ride = await Load(rideId);
            AuthorizeParticipant(ride, userId, role);
            var dto = RideMapper.ToDto(ride);
            // The start code is the customer's to read out to the driver, so surface it
            // to the rider on their own ride detail. (Drivers only see it in test mode;
            // see DriverTrips.)
            if (userId == ride.CustomerId)
                dto.StartOtp = ride.StartOtp;
            await ApplyPaymentStatus(new[] { dto });
            return dto;
        }

        public async Task<PagedResult<RideDto>> MyRides(Guid customerId, int page, int pageSize)
        {
            (page, pageSize) = Normalize(page, pageSize);
            var query = _db.Rides.AsNoTracking().Where(r => r.CustomerId == customerId).OrderByDescending(r => r.RequestedAt);
            int total = await query.CountAsync();
            var rides = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            var dtos = rides.Select(RideMapper.ToDto).ToList();
            await ApplyPaymentStatus(dtos);
            await ApplyCustomerRating(customerId, dtos);
            return PagedResult<RideDto>.Create(dtos, total, page, pageSize);
        }

        public async Task<RideTrackDto> Track(Guid userId, string role, Guid rideId)
        {
            var ride = await Load(rideId);
            AuthorizeParticipant(ride, userId, role);

            var track = new RideTrackDto { RideId = ride.Id, Status = ride.Status };
            if (ride.DriverId is Guid driverId)
            {
                var profile = await _db.DriverProfiles.AsNoTracking().FirstOrDefaultAsync(d => d.UserId == driverId);
                if (profile?.CurrentLat != null && profile.CurrentLng != null)
                {
                    track.DriverLat = profile.CurrentLat;
                    track.DriverLng = profile.CurrentLng;
                    track.UpdatedAt = profile.LocationUpdatedAt;
                    // ETA to pickup before the trip starts, else to the destination.
                    bool enRouteToPickup = ride.Status is RideStatus.Accepted or RideStatus.DriverArrived;
                    double tLat = enRouteToPickup ? ride.PickupLat : ride.DestLat;
                    double tLng = enRouteToPickup ? ride.PickupLng : ride.DestLng;
                    int dist = FareCalculator.DistanceMeters(profile.CurrentLat.Value, profile.CurrentLng.Value, tLat, tLng);
                    track.EtaSeconds = FareCalculator.DurationSeconds(dist);
                }
            }
            return track;
        }

        public async Task<FareBreakdownDto> FareBreakdown(Guid userId, string role, Guid rideId)
        {
            var ride = await Load(rideId);
            AuthorizeParticipant(ride, userId, role);

            var (baseFare, distanceFare, timeFare, _) = FareCalculator.Breakdown(ride.VehicleTypeId, ride.DistanceMeters, ride.DurationSeconds);
            int gross = ride.FinalFareMinor ?? ride.FareEstimateMinor;
            int total = Math.Max(0, gross - ride.DiscountMinor);

            // Use the persisted split when the ride is completed; otherwise project it.
            var (platform, owner, driver) = ride.Status == RideStatus.Completed
                ? (ride.PlatformCommissionMinor, ride.OwnerCutMinor, ride.DriverEarningsMinor)
                : FareCalculator.Split(total);

            string borneBy = "platform";
            if (ride.CouponCode is not null)
            {
                var coupon = await _db.Coupons.AsNoTracking().FirstOrDefaultAsync(c => c.Code == ride.CouponCode);
                borneBy = coupon?.CostBorneBy ?? "platform";
            }

            return new FareBreakdownDto
            {
                RideId = ride.Id,
                Currency = ride.Currency,
                BaseFareMinor = baseFare,
                DistanceFareMinor = distanceFare,
                TimeFareMinor = timeFare,
                SurgeMinor = 0,
                DiscountMinor = ride.DiscountMinor,
                TotalMinor = total,
                Split = new FareSplitDto
                {
                    PlatformCommissionMinor = platform,
                    OwnerCutMinor = owner,
                    DriverEarningsMinor = driver,
                    CouponCostMinor = ride.DiscountMinor,
                    CouponCostBorneBy = borneBy,
                },
            };
        }

        // ---- Recurring -------------------------------------------------------

        public async Task<RecurringRideDto> CreateRecurring(Guid customerId, RecurringRideCreateDto dto)
        {
            var type = NormalizeType(dto.VehicleTypeId);
            if (dto.DaysOfWeek.Any(d => d is < 0 or > 6))
                throw AppException.BadRequest("daysOfWeek values must be 0 (Sun) – 6 (Sat).", "INVALID_DAYS");

            var now = DateTime.UtcNow;
            var schedule = new RecurringRide
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                PickupLat = dto.Pickup.Lat,
                PickupLng = dto.Pickup.Lng,
                PickupAddress = dto.Pickup.Address,
                DestLat = dto.Destination.Lat,
                DestLng = dto.Destination.Lng,
                DestAddress = dto.Destination.Address,
                VehicleTypeId = type,
                PaymentMethod = PaymentMethodType.IsValid(dto.PaymentMethod) ? dto.PaymentMethod : PaymentMethodType.Cash,
                DaysOfWeek = dto.DaysOfWeek.Distinct().OrderBy(d => d).ToList(),
                TimeOfDay = dto.TimeOfDay,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Active = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.RecurringRides.Add(schedule);
            await _db.SaveChangesAsync();
            return RideMapper.ToDto(schedule);
        }

        public async Task<List<RecurringRideDto>> ListRecurring(Guid customerId)
        {
            var items = await _db.RecurringRides.AsNoTracking()
                .Where(r => r.CustomerId == customerId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return items.Select(RideMapper.ToDto).ToList();
        }

        public async Task CancelRecurring(Guid customerId, Guid id)
        {
            var schedule = await _db.RecurringRides.FirstOrDefaultAsync(r => r.Id == id)
                ?? throw AppException.NotFound("Recurring ride not found.");
            if (schedule.CustomerId != customerId)
                throw AppException.Forbidden("This recurring ride does not belong to you.");

            schedule.Active = false;
            schedule.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // ---- Driver ----------------------------------------------------------

        public async Task<List<RideDto>> NearbyRequests(Guid driverUserId)
        {
            var profile = await _db.DriverProfiles.AsNoTracking().FirstOrDefaultAsync(d => d.UserId == driverUserId);
            // Surface live requests plus scheduled rides whose pickup is now due (within the lead window).
            var dueBy = DateTime.UtcNow.AddMinutes(ScheduledLeadMinutes);
            var open = await _db.Rides.AsNoTracking()
                .Where(r => r.DriverId == null
                    && (r.Status == RideStatus.Requested
                        || (r.Status == RideStatus.Scheduled && r.ScheduledFor != null && r.ScheduledFor <= dueBy)))
                .OrderByDescending(r => r.RequestedAt)
                .Take(50)
                .ToListAsync();

            List<Ride> selected;
            if (profile?.CurrentLat is double lat && profile.CurrentLng is double lng)
            {
                selected = open
                    .Where(r => FareCalculator.DistanceMeters(lat, lng, r.PickupLat, r.PickupLng) <= NearbyRadiusMeters)
                    .OrderBy(r => FareCalculator.DistanceMeters(lat, lng, r.PickupLat, r.PickupLng))
                    .Take(20)
                    .ToList();
            }
            else
            {
                // No location yet — surface the most recent open requests.
                selected = open.Take(20).ToList();
            }

            // Attach each ride's customer (name + avatar) so the driver sees who's asking.
            var customerIds = selected.Select(r => r.CustomerId).Distinct().ToList();
            var customers = await _db.Users.AsNoTracking()
                .Where(u => customerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            return selected
                .Select(r => RideMapper.ToDto(r, customers.GetValueOrDefault(r.CustomerId)))
                .ToList();
        }

        public async Task<RideDto> Accept(Guid driverUserId, Guid rideId)
        {
            var ride = await Load(rideId);
            if (ride.DriverId is not null && ride.DriverId != driverUserId)
                throw AppException.Conflict("This ride has already been accepted by another driver.", "RIDE_ALREADY_TAKEN");
            if (ride.Status is not (RideStatus.Requested or RideStatus.Scheduled))
                throw AppException.Unprocessable("RIDE_NOT_ACCEPTABLE", $"A ride in '{ride.Status}' cannot be accepted.");

            var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == driverUserId)
                ?? throw AppException.Forbidden("Driver profile not found.", "NOT_A_DRIVER");
            if (profile.VerificationStatus != VerificationStatus.Approved)
                throw AppException.Forbidden("Your driver account is not yet verified.", "DRIVER_NOT_VERIFIED");

            ride.DriverId = driverUserId;
            ride.VehicleId = profile.ActiveVehicleId;
            ride.Status = RideStatus.Accepted;
            ride.AcceptedAt = DateTime.UtcNow;
            ride.UpdatedAt = ride.AcceptedAt.Value;
            await _db.SaveChangesAsync();
            return RideMapper.ToDto(ride);
        }

        public async Task<RideDto> Reject(Guid driverUserId, Guid rideId)
        {
            var ride = await Load(rideId);
            // Declining a ride this driver had tentatively taken returns it to the pool.
            if (ride.DriverId == driverUserId && ride.Status == RideStatus.Accepted)
            {
                ride.DriverId = null;
                ride.VehicleId = null;
                ride.Status = RideStatus.Requested;
                ride.AcceptedAt = null;
                ride.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            return RideMapper.ToDto(ride);
        }

        public async Task<RideDto> Arrived(Guid driverUserId, Guid rideId)
        {
            var ride = await LoadAssigned(rideId, driverUserId);
            if (ride.Status != RideStatus.Accepted)
                throw AppException.Unprocessable("INVALID_TRANSITION", $"Cannot mark arrived from '{ride.Status}'.");
            ride.Status = RideStatus.DriverArrived;
            ride.ArrivedAt = DateTime.UtcNow;
            ride.UpdatedAt = ride.ArrivedAt.Value;
            await _db.SaveChangesAsync();
            return RideMapper.ToDto(ride);
        }

        public async Task<RideDto> Start(Guid driverUserId, Guid rideId, string otp)
        {
            var ride = await LoadAssigned(rideId, driverUserId);
            if (ride.Status is not (RideStatus.DriverArrived or RideStatus.Accepted))
                throw AppException.Unprocessable("INVALID_TRANSITION", $"Cannot start a ride from '{ride.Status}'.");
            if (!string.IsNullOrEmpty(ride.StartOtp) && ride.StartOtp != otp.Trim())
                throw AppException.Unprocessable("INVALID_OTP", "The start code does not match.");

            ride.Status = RideStatus.InProgress;
            ride.StartedAt = DateTime.UtcNow;
            ride.UpdatedAt = ride.StartedAt.Value;
            await _db.SaveChangesAsync();
            return RideMapper.ToDto(ride);
        }

        public async Task<RideDto> Complete(Guid driverUserId, Guid rideId)
        {
            var ride = await LoadAssigned(rideId, driverUserId);
            if (ride.Status != RideStatus.InProgress)
                throw AppException.Unprocessable("INVALID_TRANSITION", $"Cannot complete a ride from '{ride.Status}'.");

            int gross = ride.FareEstimateMinor;
            int net = Math.Max(0, gross - ride.DiscountMinor);

            // Revenue-share owners take a cut; owner-drivers keep everything post-commission.
            int? ownerPct = null;
            if (ride.VehicleId is Guid vid)
            {
                var agreement = await _db.RentalAgreements.AsNoTracking().FirstOrDefaultAsync(a =>
                    a.VehicleId == vid && a.DriverId == driverUserId &&
                    a.Status == RentalStatus.Active && a.RentType == RentType.RevenueShare);
                ownerPct = agreement?.RevenueSharePct;
            }

            var (platform, owner, driver) = FareCalculator.Split(net, ownerPct);

            var now = DateTime.UtcNow;
            ride.FinalFareMinor = gross;
            ride.PlatformCommissionMinor = platform;
            ride.OwnerCutMinor = owner;
            ride.DriverEarningsMinor = driver;
            ride.Status = RideStatus.Completed;
            ride.CompletedAt = now;
            ride.UpdatedAt = now;
            await _db.SaveChangesAsync();

            // Earnings flow into the driver's in-app wallet (withdrawable as a payout).
            await _wallet.Credit(driverUserId, driver, WalletTxnType.RidePayment, $"Ride {ride.Id} earnings");

            // Lock the coupon redemption against the user's quota.
            if (ride.CouponCode is not null && ride.DiscountMinor > 0)
            {
                var coupon = await _db.Coupons.AsNoTracking().FirstOrDefaultAsync(c => c.Code == ride.CouponCode);
                if (coupon is not null)
                    await _coupons.LockRedemption(coupon.Id, coupon.Code, ride.CustomerId, ride.Id, ride.DiscountMinor);
            }

            return RideMapper.ToDto(ride);
        }

        public async Task<PagedResult<RideDto>> DriverTrips(Guid driverUserId, int page, int pageSize)
        {
            (page, pageSize) = Normalize(page, pageSize);
            var query = _db.Rides.AsNoTracking().Where(r => r.DriverId == driverUserId).OrderByDescending(r => r.RequestedAt);
            int total = await query.CountAsync();
            var rides = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            // Attach each trip's customer (name + avatar) so the driver sees who they drove.
            var customerIds = rides.Select(r => r.CustomerId).Distinct().ToList();
            var customers = await _db.Users.AsNoTracking()
                .Where(u => customerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            // Never surface the start code to the driver — the rider reads it out to
            // start the trip, which is what makes it a real handshake.
            var dtos = rides.Select(r => RideMapper.ToDto(r, customers.GetValueOrDefault(r.CustomerId))).ToList();
            await ApplyPaymentStatus(dtos);
            await ApplyDriverRating(driverUserId, dtos);
            return PagedResult<RideDto>.Create(dtos, total, page, pageSize);
        }

        // ---- helpers ---------------------------------------------------------

        /// <summary>Stamp each ride DTO with its settled-payment state (Paid + amount
        /// + time) by batch-loading the successful charges for these rides. Rides with
        /// no paid charge keep the default Pending status. This is what lets the client
        /// render a durable paid state instead of relying on transient mutation state.</summary>
        private async Task ApplyPaymentStatus(IReadOnlyCollection<RideDto> dtos)
        {
            if (dtos.Count == 0) return;
            var ids = dtos.Select(d => d.Id).ToList();
            var paid = await _db.Payments.AsNoTracking()
                .Where(p => ids.Contains(p.RideId) && p.Status == PaymentStatus.Paid)
                .ToListAsync();
            if (paid.Count == 0) return;

            var byRide = paid
                .GroupBy(p => p.RideId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.CreatedAt).First());

            foreach (var d in dtos)
            {
                if (byRide.TryGetValue(d.Id, out var p))
                {
                    d.PaymentStatus = PaymentStatus.Paid;
                    d.AmountPaidMinor = p.AmountMinor;
                    d.PaidAt = p.CreatedAt;
                }
            }
        }

        /// <summary>Attaches the stars the customer gave the driver on each listed ride,
        /// so the customer's ride history can flag which completed rides are rated.</summary>
        private Task ApplyCustomerRating(Guid customerId, IReadOnlyCollection<RideDto> dtos) =>
            ApplyOwnRating(customerId, ReviewTargetType.Driver, dtos, (d, stars) => d.CustomerRating = stars);

        /// <summary>Attaches the stars the driver gave the passenger on each listed trip,
        /// so the driver's trip history can mark which completed trips are rated.</summary>
        private Task ApplyDriverRating(Guid driverId, IReadOnlyCollection<RideDto> dtos) =>
            ApplyOwnRating(driverId, ReviewTargetType.Customer, dtos, (d, stars) => d.DriverRating = stars);

        /// <summary>Batch-loads the reviewer's own visible reviews of the given target type
        /// for the listed rides and stamps each DTO via <paramref name="set"/>. Used to mark
        /// a viewer's ride/trip history with the rating they themselves gave.</summary>
        private async Task ApplyOwnRating(
            Guid reviewerId, string revieweeType, IReadOnlyCollection<RideDto> dtos, Action<RideDto, int> set)
        {
            if (dtos.Count == 0) return;
            var ids = dtos.Select(d => d.Id).ToList();
            var ratings = await _db.Reviews.AsNoTracking()
                .Where(r => r.RideId != null && ids.Contains(r.RideId.Value)
                    && r.ReviewerId == reviewerId
                    && r.RevieweeType == revieweeType
                    && r.Status == ReviewStatus.Visible)
                .ToListAsync();
            if (ratings.Count == 0) return;

            var byRide = ratings
                .GroupBy(r => r.RideId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.CreatedAt).First().Rating);

            foreach (var d in dtos)
                if (byRide.TryGetValue(d.Id, out var stars))
                    set(d, stars);
        }

        private async Task<Ride> Load(Guid rideId) =>
            await _db.Rides.FirstOrDefaultAsync(r => r.Id == rideId)
            ?? throw AppException.NotFound("Ride not found.");

        private async Task<Ride> LoadAssigned(Guid rideId, Guid driverUserId)
        {
            var ride = await Load(rideId);
            if (ride.DriverId != driverUserId)
                throw AppException.Forbidden("This ride is not assigned to you.", "NOT_RIDE_DRIVER");
            return ride;
        }

        private static void AuthorizeParticipant(Ride ride, Guid userId, string role)
        {
            if (role is Roles.SupportAdmin or Roles.SuperAdmin) return;
            if (ride.CustomerId == userId || ride.DriverId == userId) return;
            throw AppException.Forbidden("You do not have access to this ride.");
        }

        private static string NormalizeType(string raw)
        {
            var match = VehicleType.All.FirstOrDefault(t => string.Equals(t, raw, StringComparison.OrdinalIgnoreCase));
            return match ?? VehicleType.Car;
        }

        private static (int page, int pageSize) Normalize(int page, int pageSize) =>
            (page < 1 ? 1 : page, pageSize is < 1 or > 100 ? 20 : pageSize);
    }
}
