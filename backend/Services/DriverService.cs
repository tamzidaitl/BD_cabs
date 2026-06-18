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
    /// Driver self-service (API_ENDPOINTS.md §3): onboarding/KYC, document upload &amp;
    /// renewal, availability (online/offline), live location push, and the earnings
    /// summary. Verification of submitted documents is an Ops responsibility (§13a).
    /// </summary>
    public class DriverService : IDriverService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public DriverService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<DriverProfileDto> GetMine(Guid userId)
        {
            var profile = await GetProfile(userId);
            return _mapper.Map<DriverProfileDto>(profile);
        }

        public async Task<DriverProfileDto> Onboard(Guid userId, DriverOnboardingDto dto)
        {
            var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == userId);
            var now = DateTime.UtcNow;

            if (profile is null)
            {
                profile = new DriverProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    VerificationStatus = VerificationStatus.Pending,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                _db.DriverProfiles.Add(profile);
            }

            profile.LicenseNumber = dto.LicenseNumber.Trim();
            profile.IsRentalDriver = dto.IsRentalDriver;
            // Re-submitting onboarding resets the queue to pending review.
            profile.VerificationStatus = VerificationStatus.Pending;
            profile.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return _mapper.Map<DriverProfileDto>(profile);
        }

        public async Task<DriverProfileDto> Update(Guid userId, DriverUpdateDto dto)
        {
            var profile = await GetProfile(userId);
            if (dto.LicenseNumber is not null) profile.LicenseNumber = dto.LicenseNumber.Trim();
            if (dto.IsRentalDriver is bool rental) profile.IsRentalDriver = rental;
            if (dto.ActiveVehicleId is Guid vid) profile.ActiveVehicleId = vid;
            profile.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<DriverProfileDto>(profile);
        }

        public async Task<DriverProfileDto> SetAvailability(Guid userId, AvailabilityDto dto)
        {
            var profile = await GetProfile(userId);

            // An explicit Mode (settings page) wins; otherwise fall back to the
            // legacy IsOnline boolean (driver Drive switch).
            var mode = dto.Mode ?? (dto.IsOnline ? AvailabilityMode.Online : AvailabilityMode.Offline);
            if (!AvailabilityMode.IsValid(mode))
                throw AppException.BadRequest($"Invalid availability mode. Allowed: {string.Join(", ", AvailabilityMode.All)}.", "INVALID_AVAILABILITY_MODE");

            // "online" and "auto" make the driver discoverable, so both require KYC approval.
            var wantsOnline = mode != AvailabilityMode.Offline;
            if (wantsOnline && profile.VerificationStatus != VerificationStatus.Approved)
                throw AppException.Forbidden("Your driver account must be verified before going online.", "DRIVER_NOT_VERIFIED");

            profile.AvailabilityMode = mode;
            profile.IsOnline = wantsOnline;
            profile.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<DriverProfileDto>(profile);
        }

        public async Task<DriverProfileDto> UpdateLocation(Guid userId, DriverLocationDto dto)
        {
            var profile = await GetProfile(userId);
            profile.CurrentLat = dto.Lat;
            profile.CurrentLng = dto.Lng;
            profile.LocationUpdatedAt = DateTime.UtcNow;
            profile.UpdatedAt = profile.LocationUpdatedAt.Value;
            await _db.SaveChangesAsync();
            return _mapper.Map<DriverProfileDto>(profile);
        }

        public async Task<DriverDocumentDto> AddDocument(Guid userId, DriverDocumentCreateDto dto)
        {
            await GetProfile(userId); // ensures the caller is a driver
            if (!DocumentType.IsValid(dto.Type))
                throw AppException.BadRequest($"Invalid document type. Allowed: {string.Join(", ", DocumentType.All)}.", "INVALID_DOCUMENT_TYPE");

            var now = DateTime.UtcNow;
            var doc = new DriverDocument
            {
                Id = Guid.NewGuid(),
                DriverUserId = userId,
                Type = dto.Type,
                DocumentUrl = dto.DocumentUrl.Trim(),
                Number = dto.Number?.Trim(),
                ExpiresAt = dto.ExpiresAt,
                VerificationStatus = VerificationStatus.Pending,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.DriverDocuments.Add(doc);
            await _db.SaveChangesAsync();
            return _mapper.Map<DriverDocumentDto>(doc);
        }

        public async Task<List<DriverDocumentDto>> ListDocuments(Guid userId)
        {
            var docs = await _db.DriverDocuments.AsNoTracking()
                .Where(d => d.DriverUserId == userId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<DriverDocumentDto>>(docs);
        }

        public async Task<DriverEarningsDto> Earnings(Guid userId)
        {
            await GetProfile(userId);

            var today = DateTime.UtcNow.Date;
            var weekStart = today.AddDays(-(int)today.DayOfWeek); // week starts Sunday

            var completed = await _db.Rides.AsNoTracking()
                .Where(r => r.DriverId == userId && r.Status == RideStatus.Completed && r.CompletedAt != null)
                .Select(r => new { r.DriverEarningsMinor, r.CompletedAt })
                .ToListAsync();

            var wallet = await _db.Wallets.AsNoTracking().FirstOrDefaultAsync(w => w.UserId == userId);

            return new DriverEarningsDto
            {
                Currency = "BDT",
                TodayMinor = completed.Where(r => r.CompletedAt!.Value.Date == today).Sum(r => r.DriverEarningsMinor),
                WeekMinor = completed.Where(r => r.CompletedAt!.Value.Date >= weekStart).Sum(r => r.DriverEarningsMinor),
                TotalMinor = completed.Sum(r => r.DriverEarningsMinor),
                CompletedTrips = completed.Count,
                WalletBalanceMinor = wallet?.BalanceMinor ?? 0,
            };
        }

        private async Task<DriverProfile> GetProfile(Guid userId) =>
            await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == userId)
            ?? throw AppException.NotFound("Driver profile not found. Complete onboarding first.", "NO_DRIVER_PROFILE");
    }
}
