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
            // End any of this owner's rentals whose end date has passed before listing.
            await RentalLifecycle.EndExpired(_db, a => a.OwnerId == ownerId, DateTime.UtcNow);

            var agreements = await _db.RentalAgreements.AsNoTracking()
                .Where(a => a.OwnerId == ownerId)
                .OrderByDescending(a => a.RequestedAt)
                .ToListAsync();

            // Enrich each request with the renting driver's profile (name, phone,
            // avatar, rating) so the owner sees who wants/rents the car.
            var driverIds = agreements.Select(a => a.DriverId).Distinct().ToList();
            var users = await _db.Users.AsNoTracking()
                .Where(u => driverIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);
            var ratings = await _db.DriverProfiles.AsNoTracking()
                .Where(d => driverIds.Contains(d.UserId))
                .ToDictionaryAsync(d => d.UserId, d => d.Rating);

            // …and with the rented car (photo + the owner's listed price/period), so the
            // request row shows which vehicle and its asking rent even before terms are set.
            var vehicleSummaries = await LoadRentalVehicleSummaries(agreements);

            return agreements.Select(a =>
            {
                var dto = _mapper.Map<RentalAgreementDto>(a);
                if (users.TryGetValue(a.DriverId, out var u))
                {
                    dto.Driver = new RentalDriverDto
                    {
                        Id = u.Id,
                        FullName = u.FullName,
                        Phone = u.Phone,
                        AvatarUrl = u.AvatarUrl,
                        Rating = ratings.TryGetValue(a.DriverId, out var r) ? r : null,
                    };
                }
                dto.Vehicle = vehicleSummaries.TryGetValue(a.VehicleId, out var v) ? v : null;
                return dto;
            }).ToList();
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
                .Where(r => r.RevieweeId == ownerId && r.RevieweeType == ReviewTargetType.Owner
                            && r.Status == ReviewStatus.Visible)
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        /// <summary>
        /// An owner rates one of their drivers (Fleet/Vehicle Owner ↔ Driver). Earned
        /// by a working relationship — the driver is/was in the owner's fleet or has
        /// rented one of the owner's vehicles. One standing, editable review per pair.
        /// </summary>
        public async Task<ReviewDto> ReviewDriver(Guid ownerId, FleetDriverReviewInputDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
                throw AppException.BadRequest("Rating must be between 1 and 5.", "INVALID_RATING");

            bool related = await _db.FleetDrivers.AnyAsync(f => f.OwnerId == ownerId && f.DriverId == dto.DriverId)
                           || await _db.RentalAgreements.AnyAsync(a => a.OwnerId == ownerId && a.DriverId == dto.DriverId);
            if (!related)
                throw AppException.Unprocessable("NO_DRIVER_RELATIONSHIP",
                    "You can review a driver only after they have joined your fleet or rented your vehicle.");

            var now = DateTime.UtcNow;
            // One standing review per (owner, driver): update in place if it exists.
            var review = await _db.Reviews.FirstOrDefaultAsync(r =>
                r.ReviewerId == ownerId && r.RevieweeId == dto.DriverId && r.RevieweeType == ReviewTargetType.Driver);

            if (review is null)
            {
                review = new Review
                {
                    Id = Guid.NewGuid(),
                    // Not tied to a ride; a synthetic id keeps the unique
                    // (RideId, ReviewerId, RevieweeType) index collision-free.
                    RideId = Guid.NewGuid(),
                    ReviewerId = ownerId,
                    RevieweeId = dto.DriverId,
                    RevieweeType = ReviewTargetType.Driver,
                    CreatedAt = now,
                };
                _db.Reviews.Add(review);
            }
            review.Rating = dto.Rating;
            review.Comment = dto.Comment?.Trim();
            review.UpdatedAt = now;
            await _db.SaveChangesAsync();

            // Refresh the driver's aggregate rating from all visible reviews about them.
            var avg = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == dto.DriverId && r.RevieweeType == ReviewTargetType.Driver
                            && r.Status == ReviewStatus.Visible)
                .AverageAsync(r => (double?)r.Rating);
            var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == dto.DriverId);
            if (profile is not null)
            {
                profile.Rating = avg.HasValue ? Math.Round(avg.Value, 2) : 0;
                profile.UpdatedAt = now;
                await _db.SaveChangesAsync();
            }

            return _mapper.Map<ReviewDto>(review);
        }

        // ---- Corporate rental contracts (Corporate ↔ Vehicle Owner) -----------

        public async Task<List<CorporateRentalContractDto>> CorporateRentalRequests(Guid ownerId)
        {
            var contracts = await _db.CorporateRentalContracts.AsNoTracking()
                .Where(c => c.OwnerId == ownerId)
                .OrderByDescending(c => c.RequestedAt)
                .ToListAsync();
            return await EnrichContractsForOwner(contracts);
        }

        public async Task<CorporateRentalContractDto> ApproveCorporateRental(Guid ownerId, Guid contractId, ApproveCorporateRentalDto dto)
        {
            var contract = await GetOwnedContract(ownerId, contractId);
            if (contract.Status != CorporateRentalStatus.Requested)
                throw AppException.Unprocessable("CONTRACT_NOT_PENDING", "Only a pending request can be approved.");
            if (dto.RateMinor < 0)
                throw AppException.BadRequest("Rate must be a non-negative amount.", "INVALID_RATE");

            if (dto.Period is not null)
            {
                if (!RentalPeriod.IsValid(dto.Period))
                    throw AppException.BadRequest($"Invalid rental period. Allowed: {string.Join(", ", RentalPeriod.All)}.", "INVALID_RENTAL_PERIOD");
                contract.Period = dto.Period;
            }

            var now = DateTime.UtcNow;
            contract.RateMinor = dto.RateMinor;
            if (dto.StartDate is DateTime start) contract.StartDate = start;
            if (dto.EndDate is DateTime end) contract.EndDate = end;
            if (dto.Note is not null) contract.Notes = dto.Note.Trim();
            contract.Status = CorporateRentalStatus.Approved;
            contract.ApprovedAt = now;
            contract.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return (await EnrichContractsForOwner(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<CorporateRentalContractDto> RejectCorporateRental(Guid ownerId, Guid contractId, RejectRentalDto dto)
        {
            var contract = await GetOwnedContract(ownerId, contractId);
            if (contract.Status != CorporateRentalStatus.Requested)
                throw AppException.Unprocessable("CONTRACT_NOT_PENDING", "Only a pending request can be rejected.");

            contract.Status = CorporateRentalStatus.Rejected;
            contract.RejectionReason = dto.Reason?.Trim();
            contract.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return (await EnrichContractsForOwner(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<CorporateRentalContractDto> ActivateCorporateRental(Guid ownerId, Guid contractId)
        {
            var contract = await GetOwnedContract(ownerId, contractId);
            if (contract.Status != CorporateRentalStatus.Approved)
                throw AppException.Unprocessable("CONTRACT_NOT_APPROVED", "Only an approved contract can be started.");

            var now = DateTime.UtcNow;
            contract.Status = CorporateRentalStatus.Active;
            contract.ActivatedAt = now;
            if (contract.StartDate is null) contract.StartDate = now;
            contract.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return (await EnrichContractsForOwner(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<CorporateRentalContractDto> CompleteCorporateRental(Guid ownerId, Guid contractId)
        {
            var contract = await GetOwnedContract(ownerId, contractId);
            if (contract.Status is not (CorporateRentalStatus.Active or CorporateRentalStatus.Approved))
                throw AppException.Unprocessable("CONTRACT_NOT_ACTIVE", "Only an approved or active contract can be completed.");

            var now = DateTime.UtcNow;
            contract.Status = CorporateRentalStatus.Completed;
            contract.CompletedAt = now;
            if (contract.EndDate is null) contract.EndDate = now;
            contract.UpdatedAt = now;

            // Release the drivers who were operating this contract's vehicle.
            var assignments = await _db.CorporateRentalDrivers
                .Where(d => d.ContractId == contract.Id && d.Status == CorporateRentalDriverStatus.Assigned)
                .ToListAsync();
            foreach (var a in assignments)
            {
                a.Status = CorporateRentalDriverStatus.Unassigned;
                a.UnassignedAt = now;
                a.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();
            return (await EnrichContractsForOwner(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<CorporateRentalContractDto> AssignDriver(Guid ownerId, Guid contractId, AssignRentalDriverDto dto)
        {
            var contract = await GetOwnedContract(ownerId, contractId);
            if (contract.Status is not (CorporateRentalStatus.Approved or CorporateRentalStatus.Active))
                throw AppException.Unprocessable("CONTRACT_NOT_STAFFABLE", "Drivers can only be assigned to an approved or active contract.");

            // The driver must belong to this owner's active fleet roster.
            bool inRoster = await _db.FleetDrivers.AnyAsync(f =>
                f.OwnerId == ownerId && f.DriverId == dto.DriverId && f.Status == FleetDriverStatus.Active);
            if (!inRoster)
                throw AppException.Unprocessable("DRIVER_NOT_IN_FLEET", "You can only assign drivers from your fleet roster.");

            var now = DateTime.UtcNow;
            var existing = await _db.CorporateRentalDrivers.FirstOrDefaultAsync(d =>
                d.ContractId == contract.Id && d.DriverId == dto.DriverId);
            if (existing is not null)
            {
                if (existing.Status == CorporateRentalDriverStatus.Assigned)
                    throw AppException.Conflict("This driver is already assigned to the contract.", "DRIVER_ALREADY_ASSIGNED");
                existing.Status = CorporateRentalDriverStatus.Assigned;
                existing.AssignedAt = now;
                existing.UnassignedAt = null;
                existing.UpdatedAt = now;
            }
            else
            {
                _db.CorporateRentalDrivers.Add(new CorporateRentalDriver
                {
                    Id = Guid.NewGuid(),
                    ContractId = contract.Id,
                    OwnerId = ownerId,
                    DriverId = dto.DriverId,
                    Status = CorporateRentalDriverStatus.Assigned,
                    AssignedAt = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
            await _db.SaveChangesAsync();
            return (await EnrichContractsForOwner(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<CorporateRentalContractDto> UnassignDriver(Guid ownerId, Guid contractId, Guid driverId)
        {
            var contract = await GetOwnedContract(ownerId, contractId);
            var assignment = await _db.CorporateRentalDrivers.FirstOrDefaultAsync(d =>
                d.ContractId == contract.Id && d.DriverId == driverId && d.Status == CorporateRentalDriverStatus.Assigned)
                ?? throw AppException.NotFound("This driver is not assigned to the contract.", "DRIVER_NOT_ASSIGNED");

            var now = DateTime.UtcNow;
            assignment.Status = CorporateRentalDriverStatus.Unassigned;
            assignment.UnassignedAt = now;
            assignment.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return (await EnrichContractsForOwner(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<ReviewDto> CreateCorporateReview(Guid ownerId, FleetCorporateReviewInputDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
                throw AppException.BadRequest("Rating must be between 1 and 5.", "INVALID_RATING");

            var profile = await _db.CorporateProfiles.FirstOrDefaultAsync(p => p.UserId == dto.CorporateId)
                ?? throw AppException.NotFound("The chosen corporate client was not found.", "CORPORATE_NOT_FOUND");

            // A review is earned by a completed rental contract with the corporate.
            bool hasCompleted = await _db.CorporateRentalContracts.AnyAsync(c =>
                c.OwnerId == ownerId && c.CorporateId == dto.CorporateId && c.Status == CorporateRentalStatus.Completed);
            if (!hasCompleted)
                throw AppException.Unprocessable("NO_COMPLETED_CONTRACT",
                    "You can review a corporate client only after a rental contract with them has completed.");

            var now = DateTime.UtcNow;
            // One standing review per (owner, corporate): update in place if it exists.
            var review = await _db.Reviews.FirstOrDefaultAsync(r =>
                r.ReviewerId == ownerId && r.RevieweeId == dto.CorporateId && r.RevieweeType == ReviewTargetType.Corporate);

            if (review is null)
            {
                review = new Review
                {
                    Id = Guid.NewGuid(),
                    // Not tied to a ride; a synthetic id keeps the unique
                    // (RideId, ReviewerId, RevieweeType) index collision-free.
                    RideId = Guid.NewGuid(),
                    ReviewerId = ownerId,
                    RevieweeId = dto.CorporateId,
                    RevieweeType = ReviewTargetType.Corporate,
                    CreatedAt = now,
                };
                _db.Reviews.Add(review);
            }
            review.Rating = dto.Rating;
            review.Comment = dto.Comment?.Trim();
            review.UpdatedAt = now;
            await _db.SaveChangesAsync();

            // Refresh the corporate's aggregate rating from all visible reviews about them.
            var ratings = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == dto.CorporateId && r.RevieweeType == ReviewTargetType.Corporate
                            && r.Status == ReviewStatus.Visible)
                .Select(r => r.Rating)
                .ToListAsync();
            profile.Rating = ratings.Count > 0 ? Math.Round(ratings.Average(), 2) : null;
            await _db.SaveChangesAsync();

            return _mapper.Map<ReviewDto>(review);
        }

        // ---- helpers ----------------------------------------------------------

        private async Task<CorporateRentalContract> GetOwnedContract(Guid ownerId, Guid contractId)
        {
            var contract = await _db.CorporateRentalContracts.FirstOrDefaultAsync(c => c.Id == contractId)
                ?? throw AppException.NotFound("Rental contract not found.", "CONTRACT_NOT_FOUND");
            if (contract.OwnerId != ownerId)
                throw AppException.Forbidden("This rental contract does not belong to you.");
            return contract;
        }

        private async Task<List<CorporateRentalContractDto>> EnrichContractsForOwner(List<CorporateRentalContract> contracts)
        {
            if (contracts.Count == 0) return new();

            var vehicleIds = contracts.Select(c => c.VehicleId).Distinct().ToList();
            var corporateIds = contracts.Select(c => c.CorporateId).Distinct().ToList();
            var contractIds = contracts.Select(c => c.Id).ToList();

            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id);
            var corpNames = await _db.CorporateProfiles.AsNoTracking()
                .Where(p => corporateIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId, p => p.CompanyName);
            var driversByContract = await LoadAssignedDrivers(contractIds);

            return contracts.Select(c =>
            {
                var dto = _mapper.Map<CorporateRentalContractDto>(c);
                if (vehicles.TryGetValue(c.VehicleId, out var v)) dto.Vehicle = _mapper.Map<VehicleDto>(v);
                dto.CorporateCompanyName = corpNames.GetValueOrDefault(c.CorporateId);
                dto.Drivers = driversByContract.GetValueOrDefault(c.Id) ?? new();
                dto.CanReview = c.Status == CorporateRentalStatus.Completed;
                return dto;
            }).ToList();
        }

        /// <summary>Load assigned drivers (with name/phone/avatar/rating) grouped by contract.</summary>
        private async Task<Dictionary<Guid, List<CorporateRentalDriverDto>>> LoadAssignedDrivers(List<Guid> contractIds)
        {
            var assignments = await _db.CorporateRentalDrivers.AsNoTracking()
                .Where(d => contractIds.Contains(d.ContractId) && d.Status == CorporateRentalDriverStatus.Assigned)
                .OrderBy(d => d.AssignedAt)
                .ToListAsync();

            var driverIds = assignments.Select(a => a.DriverId).Distinct().ToList();
            var users = await _db.Users.AsNoTracking()
                .Where(u => driverIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
            var ratings = await _db.DriverProfiles.AsNoTracking()
                .Where(p => driverIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId, p => p.Rating);

            var result = new Dictionary<Guid, List<CorporateRentalDriverDto>>();
            foreach (var a in assignments)
            {
                var dto = _mapper.Map<CorporateRentalDriverDto>(a);
                if (users.TryGetValue(a.DriverId, out var u))
                    dto.Driver = new RentalDriverDto
                    {
                        Id = u.Id,
                        FullName = u.FullName,
                        Phone = u.Phone,
                        AvatarUrl = u.AvatarUrl,
                        Rating = ratings.TryGetValue(a.DriverId, out var r) ? r : null,
                    };
                if (!result.TryGetValue(a.ContractId, out var list)) { list = new(); result[a.ContractId] = list; }
                list.Add(dto);
            }
            return result;
        }

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

        private async Task<Dictionary<Guid, RentalVehicleSummaryDto>> LoadRentalVehicleSummaries(IEnumerable<RentalAgreement> agreements) =>
            await RentalVehicleSummaryLoader.Load(_db, agreements);
    }
}
