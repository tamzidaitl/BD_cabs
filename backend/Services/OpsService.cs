using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Operations dashboard data. Counts come from real tables where this slice
    /// has them (users, drivers); ride-related KPIs are placeholders until the
    /// ride lifecycle (API_ENDPOINTS.md §5) is implemented.
    /// </summary>
    public class OpsService : IOpsService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public OpsService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<Dictionary<string, int>> Dashboard()
        {
            var totalUsers = await _db.Users.CountAsync();
            var totalDrivers = await _db.Users.CountAsync(u => u.Role == Roles.Driver);
            var onlineDrivers = await _db.DriverProfiles.CountAsync(d => d.IsOnline);
            var pendingDrivers = await _db.DriverProfiles
                .CountAsync(d => d.VerificationStatus == VerificationStatus.Pending);
            var pendingAccounts = await _db.Users.CountAsync(u => u.Status == AccountStatus.Pending);
            var activeCoupons = await _db.Coupons.CountAsync(c => c.Status == CouponStatus.Active);

            // Rides currently in flight (a driver is engaged or the trip is running).
            var activeRides = await _db.Rides.CountAsync(r => ActiveRideStatuses.Contains(r.Status));
            var since = DateTime.UtcNow.Date;
            var ridesToday = await _db.Rides.CountAsync(r => r.RequestedAt >= since);

            return new Dictionary<string, int>
            {
                ["totalUsers"] = totalUsers,
                ["totalDrivers"] = totalDrivers,
                ["onlineDrivers"] = onlineDrivers,
                ["pendingDriverVerifications"] = pendingDrivers,
                ["pendingAccounts"] = pendingAccounts,
                ["activeCoupons"] = activeCoupons,
                ["activeRides"] = activeRides,
                ["ridesToday"] = ridesToday,
            };
        }

        /// <summary>Ride states where a driver is engaged or the trip is running.</summary>
        private static readonly string[] ActiveRideStatuses =
        {
            RideStatus.Accepted, RideStatus.DriverArrived, RideStatus.InProgress,
        };

        public async Task<PagedResult<AdminRideDto>> Rides(string? status, int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var query = _db.Rides.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);
            query = query.OrderByDescending(r => r.RequestedAt);

            var totalCount = await query.CountAsync();
            var rides = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            // Batch-load the related parties/cars/safety events for this page of rides.
            var userIds = rides.Select(r => r.CustomerId)
                .Concat(rides.Where(r => r.DriverId != null).Select(r => r.DriverId!.Value))
                .Distinct().ToList();
            var users = await _db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            var vehicleIds = rides.Where(r => r.VehicleId != null).Select(r => r.VehicleId!.Value).Distinct().ToList();
            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id);

            var rideIds = rides.Select(r => r.Id).ToList();
            var activeEvents = await _db.SafetyEvents.AsNoTracking()
                .Where(e => e.RideId != null && rideIds.Contains(e.RideId.Value)
                            && e.Status == SafetyEventStatus.Active)
                .ToListAsync();
            var eventsByRide = activeEvents
                .GroupBy(e => e.RideId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var items = rides
                .Select(r => MapAdminRide(r, users, vehicles, eventsByRide))
                .ToList();

            return PagedResult<AdminRideDto>.Create(items, totalCount, page, pageSize);
        }

        private static AdminRideDto MapAdminRide(
            Ride r,
            IReadOnlyDictionary<Guid, User> users,
            IReadOnlyDictionary<Guid, Vehicle> vehicles,
            IReadOnlyDictionary<Guid, List<SafetyEvent>> eventsByRide)
        {
            var customer = users.GetValueOrDefault(r.CustomerId);
            var driver = r.DriverId is Guid did ? users.GetValueOrDefault(did) : null;
            var vehicle = r.VehicleId is Guid vid ? vehicles.GetValueOrDefault(vid) : null;

            // Surface anything an operator would want to act on, in priority order.
            var problems = new List<string>();
            if (eventsByRide.TryGetValue(r.Id, out var events))
            {
                foreach (var e in events)
                    problems.Add(e.Kind == SafetyEventKind.Sos
                        ? "SOS alert raised by rider"
                        : "Active safety event");
            }
            if (r.Status == RideStatus.Cancelled)
            {
                problems.Add(!string.IsNullOrWhiteSpace(r.CancelReason)
                    ? $"Cancelled: {r.CancelReason}"
                    : $"Cancelled by {r.CancelledBy ?? "unknown"}");
            }
            if (r.Status == RideStatus.NoDriverFound)
                problems.Add("No driver found");
            if (vehicle != null && vehicle.VerificationStatus != VerificationStatus.Approved)
                problems.Add("Assigned car is not verified");

            return new AdminRideDto
            {
                Id = r.Id,
                Status = r.Status,
                VehicleTypeId = r.VehicleTypeId,
                Customer = ToParty(r.CustomerId, customer),
                Driver = r.DriverId is Guid d ? ToParty(d, driver) : null,
                Vehicle = vehicle is null ? null : new AdminRideVehicleDto
                {
                    Id = vehicle.Id,
                    Type = vehicle.Type,
                    PlateNumber = vehicle.PlateNumber,
                    Make = vehicle.Make,
                    Model = vehicle.Model,
                    Color = vehicle.Color,
                    Year = vehicle.Year,
                    Status = vehicle.Status,
                    VerificationStatus = vehicle.VerificationStatus,
                },
                Pickup = new GeoPointDto { Lat = r.PickupLat, Lng = r.PickupLng, Address = r.PickupAddress },
                Destination = new GeoPointDto { Lat = r.DestLat, Lng = r.DestLng, Address = r.DestAddress },
                DistanceMeters = r.DistanceMeters,
                DurationSeconds = r.DurationSeconds,
                Currency = r.Currency,
                FareEstimateMinor = r.FareEstimateMinor,
                FinalFareMinor = r.FinalFareMinor,
                DiscountMinor = r.DiscountMinor,
                PaymentMethod = r.PaymentMethod,
                CancelledBy = r.CancelledBy,
                CancelReason = r.CancelReason,
                Problems = problems,
                RequestedAt = r.RequestedAt,
                StartedAt = r.StartedAt,
                CompletedAt = r.CompletedAt,
                CancelledAt = r.CancelledAt,
            };
        }

        private static AdminRidePartyDto ToParty(Guid id, User? u) => new()
        {
            Id = id,
            FullName = u?.FullName ?? "Unknown",
            Phone = u?.Phone,
            AvatarUrl = u?.AvatarUrl,
        };

        public async Task<PagedResult<UserDto>> PendingDrivers(int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            // Drivers whose KYC is still pending, joined to their user record.
            var query =
                from d in _db.DriverProfiles.AsNoTracking()
                join u in _db.Users.AsNoTracking() on d.UserId equals u.Id
                where d.VerificationStatus == VerificationStatus.Pending
                orderby u.CreatedAt descending
                select u;

            var totalCount = await query.CountAsync();
            var users = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var items = _mapper.Map<List<UserDto>>(users);
            return PagedResult<UserDto>.Create(items, totalCount, page, pageSize);
        }

        public async Task<UserDto> VerifyDriver(Guid userId, VerificationDecisionDto dto)
        {
            var status = NormalizeDecision(dto.Status);

            var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == userId)
                ?? throw AppException.NotFound("Driver profile not found.", "NO_DRIVER_PROFILE");
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw AppException.NotFound("User not found.");

            var now = DateTime.UtcNow;
            profile.VerificationStatus = status;
            profile.UpdatedAt = now;

            // Approving KYC activates the account so the driver can transact / go online;
            // rejection leaves the account pending.
            if (status == VerificationStatus.Approved)
            {
                user.Status = AccountStatus.Active;
                user.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();
            return _mapper.Map<UserDto>(user);
        }

        public async Task<PagedResult<VehicleVerificationDto>> PendingVehicles(int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var query = _db.Vehicles.AsNoTracking()
                .Where(v => v.VerificationStatus == VerificationStatus.Pending)
                .OrderByDescending(v => v.CreatedAt);

            var totalCount = await query.CountAsync();
            var vehicles = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var vehicleIds = vehicles.Select(v => v.Id).ToList();
            var ownerIds = vehicles.Select(v => v.OwnerId).Distinct().ToList();

            // Owner who posted each vehicle (the "who").
            var owners = await _db.Users.AsNoTracking()
                .Where(u => ownerIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            // Documents uploaded against each vehicle, grouped by vehicle.
            var docs = await _db.VehicleDocuments.AsNoTracking()
                .Where(d => vehicleIds.Contains(d.VehicleId))
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
            var docsByVehicle = docs
                .GroupBy(d => d.VehicleId)
                .ToDictionary(g => g.Key, g => _mapper.Map<List<VehicleDocumentDto>>(g.ToList()));

            var items = vehicles.Select(v => new VehicleVerificationDto
            {
                Vehicle = _mapper.Map<VehicleDto>(v),
                Owner = owners.TryGetValue(v.OwnerId, out var u) ? _mapper.Map<UserDto>(u) : null,
                Documents = docsByVehicle.TryGetValue(v.Id, out var d) ? d : new List<VehicleDocumentDto>(),
            }).ToList();

            return PagedResult<VehicleVerificationDto>.Create(items, totalCount, page, pageSize);
        }

        public async Task<VehicleDto> VerifyVehicle(Guid vehicleId, VerificationDecisionDto dto)
        {
            var status = NormalizeDecision(dto.Status);

            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId)
                ?? throw AppException.NotFound("Vehicle not found.");

            vehicle.VerificationStatus = status;
            // A rejected vehicle can't be on the road; the owner activates an approved
            // one themselves via PATCH /vehicles/{id}/status.
            if (status == VerificationStatus.Rejected)
            {
                vehicle.Status = VehicleStatus.Inactive;
                vehicle.IsActive = false;
            }
            vehicle.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return _mapper.Map<VehicleDto>(vehicle);
        }

        /// <summary>Validate a verification decision — only approve/reject are allowed.</summary>
        private static string NormalizeDecision(string? status)
        {
            if (status == VerificationStatus.Approved || status == VerificationStatus.Rejected)
                return status;
            throw AppException.BadRequest(
                $"Status must be '{VerificationStatus.Approved}' or '{VerificationStatus.Rejected}'.",
                "INVALID_VERIFICATION_STATUS");
        }
    }
}
