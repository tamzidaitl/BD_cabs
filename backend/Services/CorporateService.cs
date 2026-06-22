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
    /// Corporate Client operations (role_wise_story.md §4). The company books rides
    /// for its employees, controls who can book and how much they may spend, runs an
    /// approval queue, schedules recurring rides, and reads consolidated billing /
    /// reports. Fares reuse <see cref="FareCalculator"/> so estimates match the rest
    /// of the platform. Every query is scoped to the calling company's id.
    /// </summary>
    public class CorporateService : ICorporateService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public CorporateService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        // ---- Profile / KYC / billing -----------------------------------------

        public async Task<CorporateProfileDto> Onboard(Guid corporateId, CorporateOnboardingDto dto)
        {
            var profile = await _db.CorporateProfiles.FirstOrDefaultAsync(p => p.UserId == corporateId);
            var now = DateTime.UtcNow;

            if (profile is null)
            {
                profile = new CorporateProfile { Id = Guid.NewGuid(), UserId = corporateId, CreatedAt = now };
                _db.CorporateProfiles.Add(profile);
            }

            profile.CompanyName = dto.CompanyName.Trim();
            profile.TradeLicenseNumber = dto.TradeLicenseNumber.Trim();
            profile.BillingEmail = dto.BillingEmail?.Trim();
            profile.BillingAddress = dto.BillingAddress?.Trim();
            // Re-submitting KYC resets the queue to pending review.
            profile.VerificationStatus = Models.VerificationStatus.Pending;
            profile.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return _mapper.Map<CorporateProfileDto>(profile);
        }

        public async Task<CorporateProfileDto> GetProfile(Guid corporateId)
        {
            var profile = await _db.CorporateProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == corporateId)
                ?? throw AppException.NotFound("Corporate profile not found. Complete onboarding first.", "NO_CORPORATE_PROFILE");
            return _mapper.Map<CorporateProfileDto>(profile);
        }

        // ---- Employees --------------------------------------------------------

        public async Task<List<CorporateEmployeeDto>> Employees(Guid corporateId)
        {
            var employees = await _db.CorporateEmployees.AsNoTracking()
                .Where(e => e.CorporateId == corporateId)
                .OrderBy(e => e.FullName)
                .ToListAsync();

            var spend = await SpendThisMonthByEmployee(corporateId);

            return employees.Select(e =>
            {
                var dto = _mapper.Map<CorporateEmployeeDto>(e);
                dto.SpentThisMonthMinor = spend.GetValueOrDefault(e.Id);
                return dto;
            }).ToList();
        }

        public async Task<CorporateEmployeeDto> AddEmployee(Guid corporateId, CorporateEmployeeInputDto dto)
        {
            var now = DateTime.UtcNow;
            var email = dto.Email?.Trim().ToLowerInvariant();

            // Link an existing end-user account when the email matches one.
            Guid? userId = null;
            if (!string.IsNullOrEmpty(email))
            {
                var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
                userId = user?.Id;
            }

            var employee = new CorporateEmployee
            {
                Id = Guid.NewGuid(),
                CorporateId = corporateId,
                FullName = dto.FullName.Trim(),
                Email = email,
                Phone = dto.Phone?.Trim(),
                UserId = userId,
                Status = CorporateEmployeeStatus.IsValid(dto.Status) ? dto.Status! : CorporateEmployeeStatus.Active,
                MonthlySpendLimitMinor = NormalizeLimit(dto.MonthlySpendLimitMinor),
                RequiresApproval = dto.RequiresApproval,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.CorporateEmployees.Add(employee);
            await _db.SaveChangesAsync();
            return _mapper.Map<CorporateEmployeeDto>(employee);
        }

        public async Task<CorporateEmployeeDto> UpdateEmployee(Guid corporateId, Guid employeeId, CorporateEmployeeInputDto dto)
        {
            var employee = await GetOwnedEmployee(corporateId, employeeId);

            employee.FullName = dto.FullName.Trim();
            employee.Email = dto.Email?.Trim().ToLowerInvariant();
            employee.Phone = dto.Phone?.Trim();
            employee.MonthlySpendLimitMinor = NormalizeLimit(dto.MonthlySpendLimitMinor);
            employee.RequiresApproval = dto.RequiresApproval;
            if (CorporateEmployeeStatus.IsValid(dto.Status)) employee.Status = dto.Status!;
            employee.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var result = _mapper.Map<CorporateEmployeeDto>(employee);
            var spend = await SpendThisMonthByEmployee(corporateId);
            result.SpentThisMonthMinor = spend.GetValueOrDefault(employee.Id);
            return result;
        }

        public async Task RemoveEmployee(Guid corporateId, Guid employeeId)
        {
            var employee = await GetOwnedEmployee(corporateId, employeeId);
            _db.CorporateEmployees.Remove(employee);
            await _db.SaveChangesAsync();
        }

        // ---- Bookings ---------------------------------------------------------

        public async Task<List<CorporateBookingDto>> Bookings(Guid corporateId, string? status)
        {
            var query = _db.CorporateBookings.AsNoTracking().Where(b => b.CorporateId == corporateId);
            if (!string.IsNullOrEmpty(status)) query = query.Where(b => b.Status == status);

            var bookings = await query.OrderByDescending(b => b.RequestedAt).Take(200).ToListAsync();
            var names = await EmployeeNames(corporateId);

            return bookings.Select(b =>
            {
                var dto = _mapper.Map<CorporateBookingDto>(b);
                dto.EmployeeName = names.GetValueOrDefault(b.EmployeeId);
                return dto;
            }).ToList();
        }

        public async Task<CorporateBookingEstimateResultDto> EstimateBooking(Guid corporateId, CorporateBookingEstimateDto dto)
        {
            var employee = await GetOwnedEmployee(corporateId, dto.EmployeeId);
            if (!VehicleType.IsValid(dto.VehicleTypeId))
                throw AppException.BadRequest($"Invalid vehicle type. Allowed: {string.Join(", ", VehicleType.All)}.", "INVALID_VEHICLE_TYPE");

            int distance = FareCalculator.DistanceMeters(dto.PickupLat, dto.PickupLng, dto.DestLat, dto.DestLng);
            int duration = FareCalculator.DurationSeconds(distance);
            int fare = FareCalculator.EstimateFareMinor(dto.VehicleTypeId, distance, duration);

            int spent = (await SpendThisMonthByEmployee(corporateId)).GetValueOrDefault(employee.Id);
            bool exceeds = employee.MonthlySpendLimitMinor is int cap && spent + fare > cap;

            return new CorporateBookingEstimateResultDto
            {
                Currency = "BDT",
                DistanceMeters = distance,
                DurationSeconds = duration,
                FareEstimateMinor = fare,
                ApprovalRequired = employee.RequiresApproval || exceeds,
                MonthlyLimitMinor = employee.MonthlySpendLimitMinor,
                SpentThisMonthMinor = spent,
                ExceedsLimit = exceeds,
            };
        }

        public async Task<CorporateBookingDto> CreateBooking(Guid corporateId, CorporateBookingInputDto dto)
        {
            var employee = await GetOwnedEmployee(corporateId, dto.EmployeeId);
            if (employee.Status != CorporateEmployeeStatus.Active)
                throw AppException.Unprocessable("EMPLOYEE_SUSPENDED", "This employee is suspended and cannot have rides booked.");
            if (!VehicleType.IsValid(dto.VehicleTypeId))
                throw AppException.BadRequest($"Invalid vehicle type. Allowed: {string.Join(", ", VehicleType.All)}.", "INVALID_VEHICLE_TYPE");

            var allocation = dto.AllocationMode ?? RideAllocationMode.Auto;
            if (!RideAllocationMode.IsValid(allocation))
                throw AppException.BadRequest($"Invalid allocation mode. Allowed: {string.Join(", ", RideAllocationMode.All)}.", "INVALID_ALLOCATION_MODE");

            Guid? preferredFleetId = null;
            if (allocation == RideAllocationMode.Fleet)
            {
                if (dto.PreferredFleetId is not Guid fleetId)
                    throw AppException.BadRequest("Choose a fleet when allocation mode is 'fleet'.", "FLEET_REQUIRED");
                if (!await _db.FleetProfiles.AnyAsync(p => p.UserId == fleetId))
                    throw AppException.NotFound("The chosen fleet was not found.", "FLEET_NOT_FOUND");
                preferredFleetId = fleetId;
            }

            int distance = FareCalculator.DistanceMeters(dto.PickupLat, dto.PickupLng, dto.DestLat, dto.DestLng);
            int duration = FareCalculator.DurationSeconds(distance);
            int fare = FareCalculator.EstimateFareMinor(dto.VehicleTypeId, distance, duration);

            int spent = (await SpendThisMonthByEmployee(corporateId)).GetValueOrDefault(employee.Id);
            bool exceeds = employee.MonthlySpendLimitMinor is int cap && spent + fare > cap;
            bool needsApproval = employee.RequiresApproval || exceeds;

            var now = DateTime.UtcNow;
            string status = needsApproval
                ? CorporateBookingStatus.PendingApproval
                : (dto.ScheduledFor is not null ? CorporateBookingStatus.Scheduled : CorporateBookingStatus.Approved);

            var booking = new CorporateBooking
            {
                Id = Guid.NewGuid(),
                CorporateId = corporateId,
                EmployeeId = employee.Id,
                VehicleTypeId = dto.VehicleTypeId,
                Status = status,
                PickupLat = dto.PickupLat,
                PickupLng = dto.PickupLng,
                PickupAddress = dto.PickupAddress?.Trim(),
                DestLat = dto.DestLat,
                DestLng = dto.DestLng,
                DestAddress = dto.DestAddress?.Trim(),
                DistanceMeters = distance,
                DurationSeconds = duration,
                Currency = "BDT",
                FareEstimateMinor = fare,
                AllocationMode = allocation,
                PreferredFleetId = preferredFleetId,
                ApprovalRequired = needsApproval,
                Notes = dto.Notes?.Trim(),
                ScheduledFor = dto.ScheduledFor,
                RequestedAt = now,
                ApprovedAt = needsApproval ? null : now,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.CorporateBookings.Add(booking);
            await _db.SaveChangesAsync();

            var result = _mapper.Map<CorporateBookingDto>(booking);
            result.EmployeeName = employee.FullName;
            return result;
        }

        public async Task<CorporateBookingDto> ApproveBooking(Guid corporateId, Guid bookingId)
        {
            var booking = await GetOwnedBooking(corporateId, bookingId);
            if (booking.Status != CorporateBookingStatus.PendingApproval)
                throw AppException.Unprocessable("BOOKING_NOT_PENDING", "Only a booking awaiting approval can be approved.");

            var now = DateTime.UtcNow;
            booking.Status = booking.ScheduledFor is not null ? CorporateBookingStatus.Scheduled : CorporateBookingStatus.Approved;
            booking.ApprovedAt = now;
            booking.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return await ToBookingDtoWithName(booking);
        }

        public async Task<CorporateBookingDto> RejectBooking(Guid corporateId, Guid bookingId, RejectBookingDto dto)
        {
            var booking = await GetOwnedBooking(corporateId, bookingId);
            if (booking.Status != CorporateBookingStatus.PendingApproval)
                throw AppException.Unprocessable("BOOKING_NOT_PENDING", "Only a booking awaiting approval can be rejected.");

            booking.Status = CorporateBookingStatus.Rejected;
            booking.RejectionReason = dto.Reason?.Trim();
            booking.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return await ToBookingDtoWithName(booking);
        }

        public async Task<CorporateBookingDto> CompleteBooking(Guid corporateId, Guid bookingId)
        {
            var booking = await GetOwnedBooking(corporateId, bookingId);
            if (booking.Status is not (CorporateBookingStatus.Approved or CorporateBookingStatus.Scheduled))
                throw AppException.Unprocessable("BOOKING_NOT_ACTIVE", "Only an approved or scheduled booking can be completed.");

            var now = DateTime.UtcNow;
            booking.Status = CorporateBookingStatus.Completed;
            booking.FinalFareMinor = booking.FareEstimateMinor;
            booking.CompletedAt = now;
            booking.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return await ToBookingDtoWithName(booking);
        }

        public async Task<CorporateBookingDto> CancelBooking(Guid corporateId, Guid bookingId)
        {
            var booking = await GetOwnedBooking(corporateId, bookingId);
            if (!CorporateBookingStatus.Cancellable.Contains(booking.Status))
                throw AppException.Unprocessable("BOOKING_NOT_CANCELLABLE", "This booking can no longer be cancelled.");

            var now = DateTime.UtcNow;
            booking.Status = CorporateBookingStatus.Cancelled;
            booking.CancelledAt = now;
            booking.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return await ToBookingDtoWithName(booking);
        }

        // ---- Recurring rides --------------------------------------------------

        public async Task<List<CorporateRecurringRideDto>> RecurringRides(Guid corporateId)
        {
            var rides = await _db.CorporateRecurringRides.AsNoTracking()
                .Where(r => r.CorporateId == corporateId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            var names = await EmployeeNames(corporateId);

            return rides.Select(r =>
            {
                var dto = _mapper.Map<CorporateRecurringRideDto>(r);
                dto.EmployeeName = names.GetValueOrDefault(r.EmployeeId);
                return dto;
            }).ToList();
        }

        public async Task<CorporateRecurringRideDto> CreateRecurring(Guid corporateId, CorporateRecurringRideInputDto dto)
        {
            var employee = await GetOwnedEmployee(corporateId, dto.EmployeeId);
            if (!VehicleType.IsValid(dto.VehicleTypeId))
                throw AppException.BadRequest($"Invalid vehicle type. Allowed: {string.Join(", ", VehicleType.All)}.", "INVALID_VEHICLE_TYPE");

            var allocation = dto.AllocationMode ?? RideAllocationMode.Auto;
            if (!RideAllocationMode.IsValid(allocation))
                throw AppException.BadRequest($"Invalid allocation mode. Allowed: {string.Join(", ", RideAllocationMode.All)}.", "INVALID_ALLOCATION_MODE");
            if (dto.DaysOfWeek.Count == 0 || dto.DaysOfWeek.Any(d => d < 0 || d > 6))
                throw AppException.BadRequest("Pick at least one valid day of week (0=Sunday … 6=Saturday).", "INVALID_DAYS");

            Guid? preferredFleetId = null;
            if (allocation == RideAllocationMode.Fleet)
            {
                if (dto.PreferredFleetId is not Guid fleetId)
                    throw AppException.BadRequest("Choose a fleet when allocation mode is 'fleet'.", "FLEET_REQUIRED");
                if (!await _db.FleetProfiles.AnyAsync(p => p.UserId == fleetId))
                    throw AppException.NotFound("The chosen fleet was not found.", "FLEET_NOT_FOUND");
                preferredFleetId = fleetId;
            }

            var now = DateTime.UtcNow;
            var ride = new CorporateRecurringRide
            {
                Id = Guid.NewGuid(),
                CorporateId = corporateId,
                EmployeeId = employee.Id,
                VehicleTypeId = dto.VehicleTypeId,
                PickupLat = dto.PickupLat,
                PickupLng = dto.PickupLng,
                PickupAddress = dto.PickupAddress?.Trim(),
                DestLat = dto.DestLat,
                DestLng = dto.DestLng,
                DestAddress = dto.DestAddress?.Trim(),
                AllocationMode = allocation,
                PreferredFleetId = preferredFleetId,
                DaysOfWeek = dto.DaysOfWeek.Distinct().OrderBy(d => d).ToList(),
                TimeOfDay = dto.TimeOfDay,
                StartDate = dto.StartDate ?? now,
                EndDate = dto.EndDate,
                Active = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.CorporateRecurringRides.Add(ride);
            await _db.SaveChangesAsync();

            var result = _mapper.Map<CorporateRecurringRideDto>(ride);
            result.EmployeeName = employee.FullName;
            return result;
        }

        public async Task CancelRecurring(Guid corporateId, Guid recurringId)
        {
            var ride = await _db.CorporateRecurringRides.FirstOrDefaultAsync(r => r.Id == recurringId)
                ?? throw AppException.NotFound("Recurring ride not found.");
            if (ride.CorporateId != corporateId)
                throw AppException.Forbidden("This recurring ride does not belong to you.");
            _db.CorporateRecurringRides.Remove(ride);
            await _db.SaveChangesAsync();
        }

        // ---- Billing & reporting ----------------------------------------------

        public async Task<CorporateBillingDto> Billing(Guid corporateId)
        {
            var profile = await _db.CorporateProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == corporateId);

            var completed = await _db.CorporateBookings.AsNoTracking()
                .Where(b => b.CorporateId == corporateId && b.Status == CorporateBookingStatus.Completed && b.CompletedAt != null)
                .Select(b => new { b.CompletedAt, b.FinalFareMinor })
                .ToListAsync();

            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var thisMonth = completed.Where(b => b.CompletedAt >= monthStart).ToList();

            var statements = completed
                .GroupBy(b => b.CompletedAt!.Value.ToString("yyyy-MM"))
                .OrderByDescending(g => g.Key)
                .Select(g => new CorporateStatementDto
                {
                    Period = g.Key,
                    Currency = "BDT",
                    Trips = g.Count(),
                    AmountMinor = g.Sum(b => b.FinalFareMinor ?? 0),
                })
                .ToList();

            return new CorporateBillingDto
            {
                Currency = "BDT",
                BillingEmail = profile?.BillingEmail,
                BillingAddress = profile?.BillingAddress,
                CurrentMonthMinor = thisMonth.Sum(b => b.FinalFareMinor ?? 0),
                CurrentMonthTrips = thisMonth.Count,
                Statements = statements,
            };
        }

        public async Task<CorporateReportDto> Reports(Guid corporateId, DateTime? from, DateTime? to)
        {
            var toDate = to ?? DateTime.UtcNow;
            var fromDate = from ?? toDate.AddDays(-30);

            var bookings = await _db.CorporateBookings.AsNoTracking()
                .Where(b => b.CorporateId == corporateId && b.Status == CorporateBookingStatus.Completed
                            && b.CompletedAt >= fromDate && b.CompletedAt <= toDate)
                .Select(b => new { b.EmployeeId, b.VehicleTypeId, b.FinalFareMinor })
                .ToListAsync();

            var names = await EmployeeNames(corporateId);

            var byEmployee = bookings
                .GroupBy(b => b.EmployeeId)
                .Select(g => new CorporateEmployeeSpendDto
                {
                    EmployeeId = g.Key,
                    EmployeeName = names.GetValueOrDefault(g.Key) ?? "(removed)",
                    Trips = g.Count(),
                    SpendMinor = g.Sum(b => b.FinalFareMinor ?? 0),
                })
                .OrderByDescending(x => x.SpendMinor)
                .ToList();

            var byVehicleType = bookings
                .GroupBy(b => b.VehicleTypeId)
                .Select(g => new CorporateVehicleTypeSpendDto
                {
                    VehicleType = g.Key,
                    Trips = g.Count(),
                    SpendMinor = g.Sum(b => b.FinalFareMinor ?? 0),
                })
                .OrderByDescending(x => x.SpendMinor)
                .ToList();

            return new CorporateReportDto
            {
                Currency = "BDT",
                From = fromDate,
                To = toDate,
                TotalTrips = bookings.Count,
                TotalSpendMinor = bookings.Sum(b => b.FinalFareMinor ?? 0),
                ByEmployee = byEmployee,
                ByVehicleType = byVehicleType,
            };
        }

        // ---- Reviews of Fleet/Vehicle owners ----------------------------------

        public async Task<List<CorporateFleetSummaryDto>> Fleets(Guid corporateId)
        {
            var profiles = await _db.FleetProfiles.AsNoTracking()
                .OrderBy(p => p.CompanyName)
                .ToListAsync();

            var ownerIds = profiles.Select(p => p.UserId).ToList();
            var vehicleCounts = await _db.Vehicles.AsNoTracking()
                .Where(v => ownerIds.Contains(v.OwnerId))
                .GroupBy(v => v.OwnerId)
                .Select(g => new { OwnerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.OwnerId, x => x.Count);

            // Owners this company may review: those it has a completed contract with.
            var reviewableOwners = await CompletedContractOwners(corporateId);

            return profiles.Select(p => new CorporateFleetSummaryDto
            {
                OwnerId = p.UserId,
                CompanyName = p.CompanyName,
                Rating = p.Rating,
                VehicleCount = vehicleCounts.GetValueOrDefault(p.UserId),
                CanReview = reviewableOwners.Contains(p.UserId),
            }).ToList();
        }

        public async Task<List<ReviewDto>> Reviews(Guid corporateId)
        {
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.ReviewerId == corporateId && r.RevieweeType == ReviewTargetType.Owner
                            && r.Status != ReviewStatus.Removed)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        public async Task<ReviewDto> CreateReview(Guid corporateId, CorporateReviewInputDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
                throw AppException.BadRequest("Rating must be between 1 and 5.", "INVALID_RATING");
            if (!await _db.FleetProfiles.AnyAsync(p => p.UserId == dto.OwnerId))
                throw AppException.NotFound("The chosen fleet was not found.", "FLEET_NOT_FOUND");
            // A review is earned by a completed rental contract with the owner.
            bool hasCompleted = await _db.CorporateRentalContracts.AnyAsync(c =>
                c.CorporateId == corporateId && c.OwnerId == dto.OwnerId && c.Status == CorporateRentalStatus.Completed);
            if (!hasCompleted)
                throw AppException.Unprocessable("NO_COMPLETED_CONTRACT",
                    "You can review a vehicle owner only after a rental contract with them has completed.");

            var now = DateTime.UtcNow;
            // One standing review per (company, owner): update in place if it exists.
            var review = await _db.Reviews.FirstOrDefaultAsync(r =>
                r.ReviewerId == corporateId && r.RevieweeId == dto.OwnerId && r.RevieweeType == ReviewTargetType.Owner);

            if (review is null)
            {
                review = new Review
                {
                    Id = Guid.NewGuid(),
                    // Corporate reviews aren't tied to a ride; a unique synthetic id
                    // keeps the (RideId, ReviewerId, RevieweeType) index collision-free.
                    RideId = Guid.NewGuid(),
                    ReviewerId = corporateId,
                    RevieweeId = dto.OwnerId,
                    RevieweeType = ReviewTargetType.Owner,
                    CreatedAt = now,
                };
                _db.Reviews.Add(review);
            }
            review.Rating = dto.Rating;
            review.Comment = dto.Comment?.Trim();
            review.UpdatedAt = now;
            await _db.SaveChangesAsync();

            // Refresh the owner's aggregate rating so the fleet list stays in sync.
            await RecomputeOwnerRating(dto.OwnerId);
            await _db.SaveChangesAsync();

            return _mapper.Map<ReviewDto>(review);
        }

        public async Task<List<ReviewDto>> ReviewsReceived(Guid corporateId)
        {
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == corporateId && r.RevieweeType == ReviewTargetType.Corporate
                            && r.Status == ReviewStatus.Visible)
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        // ---- Vehicle rental contracts (Corporate ↔ Vehicle Owner) -------------

        public async Task<List<CorporateRentalVehicleDto>> RentalVehicles()
        {
            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => v.ForRent
                    && v.VerificationStatus == VerificationStatus.Approved
                    && v.Status == VehicleStatus.Active
                    && !VehiclesCommittedToDriver().Contains(v.Id)
                    && !VehiclesCommittedToCorporate().Contains(v.Id))
                .OrderByDescending(v => v.UpdatedAt)
                .ToListAsync();

            var ownerIds = vehicles.Select(v => v.OwnerId).Distinct().ToList();
            var profiles = await _db.FleetProfiles.AsNoTracking()
                .Where(p => ownerIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId);

            return vehicles.Select(v =>
            {
                profiles.TryGetValue(v.OwnerId, out var p);
                return new CorporateRentalVehicleDto
                {
                    Vehicle = _mapper.Map<VehicleDto>(v),
                    OwnerId = v.OwnerId,
                    OwnerCompanyName = p?.CompanyName,
                    OwnerRating = p?.Rating,
                };
            }).ToList();
        }

        public async Task<List<CorporateRentalContractDto>> RentalContracts(Guid corporateId)
        {
            var contracts = await _db.CorporateRentalContracts.AsNoTracking()
                .Where(c => c.CorporateId == corporateId)
                .OrderByDescending(c => c.RequestedAt)
                .ToListAsync();
            return await EnrichContractsForCorporate(contracts);
        }

        public async Task<CorporateRentalContractDto> RequestRentalContract(Guid corporateId, CorporateRentalRequestDto dto)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == dto.VehicleId)
                ?? throw AppException.NotFound("Vehicle not found.");
            if (!vehicle.ForRent)
                throw AppException.Unprocessable("VEHICLE_NOT_FOR_RENT", "This vehicle is not offered for rent.");
            if (vehicle.VerificationStatus != VerificationStatus.Approved || vehicle.Status != VehicleStatus.Active)
                throw AppException.Unprocessable("VEHICLE_UNAVAILABLE", "This vehicle is not currently available to rent.");

            var period = dto.Period ?? RentalPeriod.Monthly;
            if (!RentalPeriod.IsValid(period))
                throw AppException.BadRequest($"Invalid rental period. Allowed: {string.Join(", ", RentalPeriod.All)}.", "INVALID_RENTAL_PERIOD");

            // No duplicate open request/contract for the same (company, vehicle).
            bool duplicate = await _db.CorporateRentalContracts.AnyAsync(c =>
                c.VehicleId == vehicle.Id && c.CorporateId == corporateId &&
                (c.Status == CorporateRentalStatus.Requested || c.Status == CorporateRentalStatus.Approved || c.Status == CorporateRentalStatus.Active));
            if (duplicate)
                throw AppException.Conflict("You already have an open request or contract for this vehicle.", "CORP_RENTAL_EXISTS");

            // The vehicle must not already be committed to a driver or another corporate.
            bool committed = await _db.RentalAgreements.AnyAsync(a => a.VehicleId == vehicle.Id &&
                    (a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved))
                || await _db.CorporateRentalContracts.AnyAsync(c => c.VehicleId == vehicle.Id &&
                    (c.Status == CorporateRentalStatus.Approved || c.Status == CorporateRentalStatus.Active));
            if (committed)
                throw AppException.Conflict("This vehicle is already committed to another rental.", "VEHICLE_COMMITTED");

            var now = DateTime.UtcNow;
            var contract = new CorporateRentalContract
            {
                Id = Guid.NewGuid(),
                CorporateId = corporateId,
                OwnerId = vehicle.OwnerId,
                VehicleId = vehicle.Id,
                Status = CorporateRentalStatus.Requested,
                Period = period,
                Currency = "BDT",
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                ServicePurpose = dto.ServicePurpose?.Trim(),
                Notes = dto.Notes?.Trim(),
                RequestedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.CorporateRentalContracts.Add(contract);
            await _db.SaveChangesAsync();

            return (await EnrichContractsForCorporate(new List<CorporateRentalContract> { contract })).First();
        }

        public async Task<CorporateRentalContractDto> CancelRentalContract(Guid corporateId, Guid contractId)
        {
            var contract = await _db.CorporateRentalContracts.FirstOrDefaultAsync(c => c.Id == contractId)
                ?? throw AppException.NotFound("Rental contract not found.", "CONTRACT_NOT_FOUND");
            if (contract.CorporateId != corporateId)
                throw AppException.Forbidden("This rental contract does not belong to your company.");
            if (!CorporateRentalStatus.Cancellable.Contains(contract.Status))
                throw AppException.Unprocessable("CONTRACT_NOT_CANCELLABLE", "This rental contract can no longer be cancelled.");

            var now = DateTime.UtcNow;
            contract.Status = CorporateRentalStatus.Cancelled;
            contract.CancelledAt = now;
            contract.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return (await EnrichContractsForCorporate(new List<CorporateRentalContract> { contract })).First();
        }

        // ---- helpers ----------------------------------------------------------

        private static int? NormalizeLimit(int? limit) => limit is > 0 ? limit : null;

        /// <summary>Vehicle ids tied up in an active/approved driver rental.</summary>
        private IQueryable<Guid> VehiclesCommittedToDriver() =>
            _db.RentalAgreements
                .Where(a => a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved)
                .Select(a => a.VehicleId);

        /// <summary>Vehicle ids tied up in an approved/active corporate contract.</summary>
        private IQueryable<Guid> VehiclesCommittedToCorporate() =>
            _db.CorporateRentalContracts
                .Where(c => c.Status == CorporateRentalStatus.Approved || c.Status == CorporateRentalStatus.Active)
                .Select(c => c.VehicleId);

        /// <summary>Owner ids the company has at least one completed contract with.</summary>
        private async Task<HashSet<Guid>> CompletedContractOwners(Guid corporateId) =>
            (await _db.CorporateRentalContracts.AsNoTracking()
                .Where(c => c.CorporateId == corporateId && c.Status == CorporateRentalStatus.Completed)
                .Select(c => c.OwnerId)
                .Distinct()
                .ToListAsync()).ToHashSet();

        private async Task<List<CorporateRentalContractDto>> EnrichContractsForCorporate(List<CorporateRentalContract> contracts)
        {
            if (contracts.Count == 0) return new();

            var vehicleIds = contracts.Select(c => c.VehicleId).Distinct().ToList();
            var ownerIds = contracts.Select(c => c.OwnerId).Distinct().ToList();
            var contractIds = contracts.Select(c => c.Id).ToList();

            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id);
            var ownerNames = await _db.FleetProfiles.AsNoTracking()
                .Where(p => ownerIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId, p => p.CompanyName);
            var driversByContract = await LoadAssignedDrivers(contractIds);

            return contracts.Select(c =>
            {
                var dto = _mapper.Map<CorporateRentalContractDto>(c);
                if (vehicles.TryGetValue(c.VehicleId, out var v)) dto.Vehicle = _mapper.Map<VehicleDto>(v);
                dto.OwnerCompanyName = ownerNames.GetValueOrDefault(c.OwnerId);
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

        private async Task<CorporateEmployee> GetOwnedEmployee(Guid corporateId, Guid employeeId)
        {
            var employee = await _db.CorporateEmployees.FirstOrDefaultAsync(e => e.Id == employeeId)
                ?? throw AppException.NotFound("Employee not found.", "EMPLOYEE_NOT_FOUND");
            if (employee.CorporateId != corporateId)
                throw AppException.Forbidden("This employee does not belong to your company.");
            return employee;
        }

        private async Task<CorporateBooking> GetOwnedBooking(Guid corporateId, Guid bookingId)
        {
            var booking = await _db.CorporateBookings.FirstOrDefaultAsync(b => b.Id == bookingId)
                ?? throw AppException.NotFound("Booking not found.", "BOOKING_NOT_FOUND");
            if (booking.CorporateId != corporateId)
                throw AppException.Forbidden("This booking does not belong to your company.");
            return booking;
        }

        private async Task<Dictionary<Guid, string>> EmployeeNames(Guid corporateId) =>
            await _db.CorporateEmployees.AsNoTracking()
                .Where(e => e.CorporateId == corporateId)
                .ToDictionaryAsync(e => e.Id, e => e.FullName);

        private async Task<CorporateBookingDto> ToBookingDtoWithName(CorporateBooking booking)
        {
            var dto = _mapper.Map<CorporateBookingDto>(booking);
            dto.EmployeeName = await _db.CorporateEmployees.AsNoTracking()
                .Where(e => e.Id == booking.EmployeeId)
                .Select(e => e.FullName)
                .FirstOrDefaultAsync();
            return dto;
        }

        /// <summary>Completed-booking spend per employee for the current calendar month.</summary>
        private async Task<Dictionary<Guid, int>> SpendThisMonthByEmployee(Guid corporateId)
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var rows = await _db.CorporateBookings.AsNoTracking()
                .Where(b => b.CorporateId == corporateId && b.Status == CorporateBookingStatus.Completed
                            && b.CompletedAt >= monthStart)
                .GroupBy(b => b.EmployeeId)
                .Select(g => new { EmployeeId = g.Key, Spent = g.Sum(b => b.FinalFareMinor ?? 0) })
                .ToListAsync();

            return rows.ToDictionary(r => r.EmployeeId, r => r.Spent);
        }

        private async Task RecomputeOwnerRating(Guid ownerId)
        {
            var ratings = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == ownerId && r.RevieweeType == ReviewTargetType.Owner
                            && r.Status == ReviewStatus.Visible)
                .Select(r => r.Rating)
                .ToListAsync();

            var profile = await _db.FleetProfiles.FirstOrDefaultAsync(p => p.UserId == ownerId);
            if (profile is not null)
                profile.Rating = ratings.Count > 0 ? Math.Round(ratings.Average(), 2) : null;
        }
    }
}
