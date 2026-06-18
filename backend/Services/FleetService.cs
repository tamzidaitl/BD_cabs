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
    /// Fleet/Vehicle Owner operations (API_ENDPOINTS.md §4b). Complements the driver
    /// side of the rental flow (<see cref="RentalService"/>): here the owner approves
    /// requests and sets terms, tracks rent received, manages the driver roster, and
    /// reads performance / revenue / settlement reports.
    /// </summary>
    public class FleetService : IFleetService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public FleetService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        // ---- Owner profile / KYC ---------------------------------------------

        public async Task<FleetProfileDto> Onboard(Guid ownerId, FleetOnboardingDto dto)
        {
            var profile = await _db.FleetProfiles.FirstOrDefaultAsync(p => p.UserId == ownerId);
            var now = DateTime.UtcNow;

            if (profile is null)
            {
                profile = new FleetProfile { Id = Guid.NewGuid(), UserId = ownerId, CreatedAt = now };
                _db.FleetProfiles.Add(profile);
            }

            profile.CompanyName = dto.CompanyName?.Trim();
            profile.TradeLicenseNumber = dto.TradeLicenseNumber.Trim();
            profile.NidNumber = dto.NidNumber.Trim();
            profile.BankAccount = dto.BankAccount?.Trim();
            // Re-submitting KYC resets the queue to pending review.
            profile.VerificationStatus = Models.VerificationStatus.Pending;
            profile.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return _mapper.Map<FleetProfileDto>(profile);
        }

        public async Task<FleetProfileDto> GetProfile(Guid ownerId)
        {
            var profile = await _db.FleetProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == ownerId)
                ?? throw AppException.NotFound("Fleet profile not found. Complete onboarding first.", "NO_FLEET_PROFILE");
            return _mapper.Map<FleetProfileDto>(profile);
        }

        // ---- Vehicles ---------------------------------------------------------

        public async Task<List<VehicleDto>> Vehicles(Guid ownerId)
        {
            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => v.OwnerId == ownerId)
                .OrderByDescending(v => v.UpdatedAt)
                .ToListAsync();
            return _mapper.Map<List<VehicleDto>>(vehicles);
        }

        // ---- Driver roster ----------------------------------------------------

        public async Task<List<FleetDriverDto>> Drivers(Guid ownerId)
        {
            var members = await _db.FleetDrivers.AsNoTracking()
                .Where(f => f.OwnerId == ownerId && f.Status == FleetDriverStatus.Active)
                .OrderByDescending(f => f.InvitedAt)
                .ToListAsync();

            var driverIds = members.Select(m => m.DriverId).ToList();
            var users = await _db.Users.AsNoTracking()
                .Where(u => driverIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            return members.Select(m =>
            {
                var dto = _mapper.Map<FleetDriverDto>(m);
                dto.Driver = users.TryGetValue(m.DriverId, out var u) ? _mapper.Map<UserDto>(u) : null;
                return dto;
            }).ToList();
        }

        public async Task<FleetDriverDto> InviteDriver(Guid ownerId, FleetDriverInviteDto dto)
        {
            var key = dto.EmailOrPhone.Trim().ToLowerInvariant();
            var driver = await _db.Users.FirstOrDefaultAsync(u =>
                (u.Email == key || u.Phone == dto.EmailOrPhone.Trim()) && u.Role == Roles.Driver)
                ?? throw AppException.NotFound("No driver account found with that email or phone.", "DRIVER_NOT_FOUND");

            var now = DateTime.UtcNow;
            var existing = await _db.FleetDrivers.FirstOrDefaultAsync(f => f.OwnerId == ownerId && f.DriverId == driver.Id);
            if (existing is not null)
            {
                if (existing.Status == FleetDriverStatus.Active)
                    throw AppException.Conflict("This driver is already in your fleet.", "DRIVER_ALREADY_IN_FLEET");
                // Re-invite a previously removed driver.
                existing.Status = FleetDriverStatus.Active;
                existing.Note = dto.Note?.Trim();
                existing.InvitedAt = now;
                existing.RemovedAt = null;
                existing.UpdatedAt = now;
            }
            else
            {
                existing = new FleetDriver
                {
                    Id = Guid.NewGuid(),
                    OwnerId = ownerId,
                    DriverId = driver.Id,
                    Status = FleetDriverStatus.Active,
                    Note = dto.Note?.Trim(),
                    InvitedAt = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                _db.FleetDrivers.Add(existing);
            }
            await _db.SaveChangesAsync();

            var result = _mapper.Map<FleetDriverDto>(existing);
            result.Driver = _mapper.Map<UserDto>(driver);
            return result;
        }

        public async Task RemoveDriver(Guid ownerId, Guid driverId)
        {
            var member = await _db.FleetDrivers.FirstOrDefaultAsync(f =>
                f.OwnerId == ownerId && f.DriverId == driverId && f.Status == FleetDriverStatus.Active)
                ?? throw AppException.NotFound("This driver is not in your fleet.", "DRIVER_NOT_IN_FLEET");

            var now = DateTime.UtcNow;
            member.Status = FleetDriverStatus.Removed;
            member.RemovedAt = now;
            member.UpdatedAt = now;
            await _db.SaveChangesAsync();
        }

        // ---- Rental requests, approval & terms --------------------------------

        public async Task<List<RentalAgreementDto>> RentalRequests(Guid ownerId)
        {
            var agreements = await _db.RentalAgreements.AsNoTracking()
                .Where(a => a.OwnerId == ownerId)
                .OrderByDescending(a => a.RequestedAt)
                .ToListAsync();
            return _mapper.Map<List<RentalAgreementDto>>(agreements);
        }

        public async Task<RentalAgreementDto> ApproveRental(Guid ownerId, Guid agreementId, ApproveRentalDto dto)
        {
            var agreement = await GetOwnedAgreement(ownerId, agreementId);
            if (agreement.Status is not (RentalStatus.Requested))
                throw AppException.Unprocessable("RENTAL_NOT_PENDING", "Only a pending request can be approved.");

            ApplyTerms(agreement, dto.RentType, dto.RentAmountMinor, dto.RevenueSharePct);
            if (dto.Note is not null) agreement.Note = dto.Note.Trim();

            var now = DateTime.UtcNow;
            agreement.StartDate = dto.StartDate ?? now;
            agreement.EndDate = dto.EndDate;
            agreement.Status = RentalStatus.Active;
            agreement.ApprovedAt = now;
            agreement.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return _mapper.Map<RentalAgreementDto>(agreement);
        }

        public async Task<RentalAgreementDto> RejectRental(Guid ownerId, Guid agreementId, RejectRentalDto dto)
        {
            var agreement = await GetOwnedAgreement(ownerId, agreementId);
            if (agreement.Status is not (RentalStatus.Requested))
                throw AppException.Unprocessable("RENTAL_NOT_PENDING", "Only a pending request can be rejected.");

            agreement.Status = RentalStatus.Rejected;
            if (dto.Reason is not null) agreement.Note = dto.Reason.Trim();
            agreement.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<RentalAgreementDto>(agreement);
        }

        public async Task<RentalAgreementDto> UpdateTerms(Guid ownerId, Guid agreementId, UpdateRentalTermsDto dto)
        {
            var agreement = await GetOwnedAgreement(ownerId, agreementId);
            if (agreement.Status is RentalStatus.Rejected or RentalStatus.Ended)
                throw AppException.Unprocessable("RENTAL_CLOSED", "Terms cannot be changed on a closed agreement.");

            // Allow a partial update: fall back to the current values when omitted.
            var rentType = dto.RentType ?? agreement.RentType ?? RentType.Fixed;
            var amount = dto.RentAmountMinor ?? agreement.RentAmountMinor;
            var share = dto.RevenueSharePct ?? agreement.RevenueSharePct;
            ApplyTerms(agreement, rentType, amount, share);

            if (dto.Note is not null) agreement.Note = dto.Note.Trim();
            if (dto.EndDate is DateTime end) agreement.EndDate = end;
            agreement.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<RentalAgreementDto>(agreement);
        }

        public async Task<RentReceivedDto> RentReceived(Guid ownerId, Guid agreementId)
        {
            var agreement = await GetOwnedAgreement(ownerId, agreementId);
            var payments = await _db.RentPayments.AsNoTracking()
                .Where(p => p.RentalAgreementId == agreement.Id && p.OwnerId == ownerId && p.Status == PaymentStatus.Paid)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return new RentReceivedDto
            {
                RentalAgreementId = agreement.Id,
                Currency = "BDT",
                TotalReceivedMinor = payments.Sum(p => p.AmountMinor),
                Payments = _mapper.Map<List<RentPaymentDto>>(payments),
            };
        }

        // ---- Performance, revenue & settlements -------------------------------

        public async Task<List<VehiclePerformanceDto>> Performance(Guid ownerId)
        {
            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => v.OwnerId == ownerId)
                .ToListAsync();
            var vehicleIds = vehicles.Select(v => v.Id).ToList();

            // Completed-ride aggregates per vehicle.
            var rideStats = await _db.Rides.AsNoTracking()
                .Where(r => r.VehicleId != null && vehicleIds.Contains(r.VehicleId!.Value) && r.Status == RideStatus.Completed)
                .GroupBy(r => r.VehicleId!.Value)
                .Select(g => new
                {
                    VehicleId = g.Key,
                    Trips = g.Count(),
                    Gross = g.Sum(r => r.FinalFareMinor ?? 0),
                    OwnerCut = g.Sum(r => r.OwnerCutMinor),
                })
                .ToDictionaryAsync(x => x.VehicleId);

            // The driver currently assigned to each vehicle (+ their live location).
            var activeProfiles = await _db.DriverProfiles.AsNoTracking()
                .Where(d => d.ActiveVehicleId != null && vehicleIds.Contains(d.ActiveVehicleId!.Value))
                .ToListAsync();
            var byVehicle = activeProfiles
                .GroupBy(d => d.ActiveVehicleId!.Value)
                .ToDictionary(g => g.Key, g => g.First());

            return vehicles.Select(v =>
            {
                rideStats.TryGetValue(v.Id, out var s);
                byVehicle.TryGetValue(v.Id, out var driver);
                return new VehiclePerformanceDto
                {
                    VehicleId = v.Id,
                    PlateNumber = v.PlateNumber,
                    Status = v.Status,
                    CompletedTrips = s?.Trips ?? 0,
                    GrossFareMinor = s?.Gross ?? 0,
                    OwnerEarningsMinor = s?.OwnerCut ?? 0,
                    ActiveDriverId = driver?.UserId,
                    CurrentLat = driver?.CurrentLat,
                    CurrentLng = driver?.CurrentLng,
                    LocationUpdatedAt = driver?.LocationUpdatedAt,
                };
            }).ToList();
        }

        public async Task<RevenueReportDto> Revenue(Guid ownerId, DateTime? from, DateTime? to)
        {
            var toDate = to ?? DateTime.UtcNow;
            var fromDate = from ?? toDate.AddDays(-30);

            var vehicleIds = await _db.Vehicles.AsNoTracking()
                .Where(v => v.OwnerId == ownerId).Select(v => v.Id).ToListAsync();

            var rides = await _db.Rides.AsNoTracking()
                .Where(r => r.VehicleId != null && vehicleIds.Contains(r.VehicleId!.Value)
                            && r.Status == RideStatus.Completed
                            && r.CompletedAt >= fromDate && r.CompletedAt <= toDate)
                .Select(r => new { r.FinalFareMinor, r.OwnerCutMinor })
                .ToListAsync();

            var rentCollected = await _db.RentPayments.AsNoTracking()
                .Where(p => p.OwnerId == ownerId && p.Status == PaymentStatus.Paid
                            && p.CreatedAt >= fromDate && p.CreatedAt <= toDate)
                .SumAsync(p => p.AmountMinor);

            int ownerCut = rides.Sum(r => r.OwnerCutMinor);
            return new RevenueReportDto
            {
                Currency = "BDT",
                From = fromDate,
                To = toDate,
                CompletedTrips = rides.Count,
                GrossFareMinor = rides.Sum(r => r.FinalFareMinor ?? 0),
                OwnerCutMinor = ownerCut,
                RentCollectedMinor = rentCollected,
                TotalRevenueMinor = ownerCut + rentCollected,
            };
        }

        public async Task<List<SettlementDto>> Settlements(Guid ownerId)
        {
            // Settlement statements grouped by rent-payment period (e.g. "2026-06").
            var payments = await _db.RentPayments.AsNoTracking()
                .Where(p => p.OwnerId == ownerId && p.Status == PaymentStatus.Paid)
                .Select(p => new { p.Period, p.AmountMinor })
                .ToListAsync();

            return payments
                .GroupBy(p => p.Period ?? "—")
                .OrderByDescending(g => g.Key)
                .Select(g => new SettlementDto
                {
                    Period = g.Key,
                    Currency = "BDT",
                    RentCollectedMinor = g.Sum(p => p.AmountMinor),
                    OwnerCutMinor = 0,
                    TotalMinor = g.Sum(p => p.AmountMinor),
                })
                .ToList();
        }

        // ---- Reviews ----------------------------------------------------------

        public async Task<List<ReviewDto>> ReviewsReceived(Guid ownerId)
        {
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == ownerId && r.RevieweeType == ReviewTargetType.Owner)
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        // ---- helpers ----------------------------------------------------------

        private static void ApplyTerms(RentalAgreement agreement, string rentType, int? amount, int? sharePct)
        {
            if (!RentType.IsValid(rentType))
                throw AppException.BadRequest($"Invalid rent type. Allowed: {string.Join(", ", RentType.All)}.", "INVALID_RENT_TYPE");

            if (rentType == RentType.Fixed)
            {
                if (amount is not int a || a < 0)
                    throw AppException.BadRequest("A non-negative fixed rent amount is required.", "INVALID_RENT_AMOUNT");
                agreement.RentType = RentType.Fixed;
                agreement.RentAmountMinor = a;
                agreement.RevenueSharePct = null;
            }
            else
            {
                if (sharePct is not int p || p < 0 || p > 100)
                    throw AppException.BadRequest("Revenue share must be a percentage between 0 and 100.", "INVALID_REVENUE_SHARE");
                agreement.RentType = RentType.RevenueShare;
                agreement.RevenueSharePct = p;
                agreement.RentAmountMinor = null;
            }
        }

        private async Task<RentalAgreement> GetOwnedAgreement(Guid ownerId, Guid agreementId)
        {
            var agreement = await _db.RentalAgreements.FirstOrDefaultAsync(a => a.Id == agreementId)
                ?? throw AppException.NotFound("Rental agreement not found.");
            if (agreement.OwnerId != ownerId)
                throw AppException.Forbidden("This rental agreement does not belong to you.");
            return agreement;
        }
    }
}
