using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    public class CouponService : ICouponService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public CouponService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<CouponDto>> ListAll()
        {
            var coupons = await _db.Coupons
                .AsNoTracking()
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<CouponDto>>(coupons);
        }

        public async Task<List<CouponDto>> ListAvailable(Guid userId, string role)
        {
            var now = DateTime.UtcNow;
            var coupons = await _db.Coupons
                .AsNoTracking()
                .Where(c => c.Status == CouponStatus.Active && c.ValidFrom <= now && c.ValidTo >= now)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            // Filter to the user's role (empty applicableRoles = open to everyone).
            var eligible = coupons.Where(c => c.ApplicableRoles.Count == 0 || c.ApplicableRoles.Contains(role)).ToList();
            return _mapper.Map<List<CouponDto>>(eligible);
        }

        public async Task<CouponDto> Create(CouponCreateDto dto)
        {
            if (!CouponType.IsValid(dto.Type))
                throw AppException.BadRequest($"Invalid coupon type. Allowed: {string.Join(", ", CouponType.All)}.", "INVALID_COUPON_TYPE");

            if (dto.Status is not null && !CouponStatus.IsValid(dto.Status))
                throw AppException.BadRequest($"Invalid status. Allowed: {string.Join(", ", CouponStatus.All)}.", "INVALID_STATUS");

            if (dto.ValidTo <= dto.ValidFrom)
                throw AppException.BadRequest("validTo must be after validFrom.", "INVALID_DATE_RANGE");

            var code = dto.Code.Trim().ToUpperInvariant();
            if (await _db.Coupons.AnyAsync(c => c.Code == code))
                throw AppException.Conflict("A coupon with this code already exists.", "COUPON_CODE_TAKEN");

            var coupon = _mapper.Map<Coupon>(dto);
            coupon.Id = Guid.NewGuid();
            coupon.Code = code;
            coupon.Status = dto.Status ?? CouponStatus.Active;
            coupon.CreatedAt = DateTime.UtcNow;
            coupon.UpdatedAt = coupon.CreatedAt;

            _db.Coupons.Add(coupon);
            await _db.SaveChangesAsync();

            return _mapper.Map<CouponDto>(coupon);
        }

        public async Task<CouponDto> SetStatus(Guid id, string status)
        {
            if (!CouponStatus.IsValid(status))
                throw AppException.BadRequest($"Invalid status. Allowed: {string.Join(", ", CouponStatus.All)}.", "INVALID_STATUS");

            var coupon = await _db.Coupons.FindAsync(id)
                ?? throw AppException.NotFound("Coupon not found.");

            coupon.Status = status;
            coupon.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return _mapper.Map<CouponDto>(coupon);
        }

        public async Task<ApplyCouponResultDto> Apply(Guid userId, ApplyCouponDto dto)
        {
            var (coupon, discount) = await Validate(dto.Code, userId, dto.FareMinor, dto.CityId);
            return new ApplyCouponResultDto
            {
                Code = coupon.Code,
                Type = coupon.Type,
                DiscountMinor = discount,
                FareMinor = dto.FareMinor,
                PayableMinor = Math.Max(0, dto.FareMinor - discount),
                CostBorneBy = coupon.CostBorneBy,
            };
        }

        public Task<(Coupon coupon, int discountMinor)> ValidateForRide(string code, Guid userId, int fareMinor)
            => Validate(code, userId, fareMinor, cityId: null);

        public async Task LockRedemption(Guid couponId, string code, Guid userId, Guid rideId, int discountMinor)
        {
            // Idempotent: one locked redemption per ride.
            var existing = await _db.CouponRedemptions
                .FirstOrDefaultAsync(r => r.RideId == rideId && r.Status == CouponRedemptionStatus.Locked);
            if (existing is not null) return;

            var now = DateTime.UtcNow;
            _db.CouponRedemptions.Add(new CouponRedemption
            {
                Id = Guid.NewGuid(),
                CouponId = couponId,
                CouponCode = code,
                UserId = userId,
                RideId = rideId,
                DiscountMinor = discountMinor,
                Status = CouponRedemptionStatus.Locked,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await _db.SaveChangesAsync();
        }

        public async Task ReleaseRedemption(Guid rideId)
        {
            var redemptions = await _db.CouponRedemptions
                .Where(r => r.RideId == rideId && r.Status == CouponRedemptionStatus.Locked)
                .ToListAsync();
            foreach (var r in redemptions)
            {
                r.Status = CouponRedemptionStatus.Released;
                r.UpdatedAt = DateTime.UtcNow;
            }
            if (redemptions.Count > 0) await _db.SaveChangesAsync();
        }

        // ---- validation ------------------------------------------------------

        /// <summary>
        /// Runs the full coupon validation rule-set (role_wise_story.md → Coupon
        /// System) and returns the matched coupon plus the computed discount. Throws
        /// a 422 AppException with the stable code on any failure.
        /// </summary>
        private async Task<(Coupon coupon, int discountMinor)> Validate(string code, Guid userId, int fareMinor, Guid? cityId)
        {
            var normalized = code.Trim().ToUpperInvariant();
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Code == normalized)
                ?? throw AppException.Unprocessable("COUPON_NOT_FOUND", "Coupon code not found.");

            var now = DateTime.UtcNow;

            if (coupon.Status != CouponStatus.Active)
                throw AppException.Unprocessable("COUPON_INACTIVE", "This coupon is not active.");

            if (now < coupon.ValidFrom || now > coupon.ValidTo)
                throw AppException.Unprocessable("COUPON_EXPIRED", "This coupon is outside its valid date range.");

            if (coupon.MinFare is int min && fareMinor < min)
                throw AppException.Unprocessable("MIN_FARE_NOT_MET", "Ride fare is below this coupon's minimum.");

            if (coupon.ApplicableCities.Count > 0 && (cityId is null || !coupon.ApplicableCities.Contains(cityId.Value)))
                throw AppException.Unprocessable("CITY_NOT_ELIGIBLE", "This coupon is not valid in your city.");

            if (coupon.UsageLimitPerUser is int perUser)
            {
                var used = await _db.CouponRedemptions.CountAsync(r =>
                    r.CouponId == coupon.Id && r.UserId == userId && r.Status == CouponRedemptionStatus.Locked);
                if (used >= perUser)
                    throw AppException.Unprocessable("PER_USER_LIMIT_REACHED", "You have already used this coupon the maximum number of times.");
            }

            if (coupon.UsageLimitTotal is int total)
            {
                var usedTotal = await _db.CouponRedemptions.CountAsync(r =>
                    r.CouponId == coupon.Id && r.Status == CouponRedemptionStatus.Locked);
                if (usedTotal >= total)
                    throw AppException.Unprocessable("TOTAL_LIMIT_REACHED", "This coupon has reached its total redemption limit.");
            }

            if (coupon.FirstRideOnly)
            {
                var hasCompleted = await _db.Rides.AnyAsync(r =>
                    r.CustomerId == userId && r.Status == RideStatus.Completed);
                if (hasCompleted)
                    throw AppException.Unprocessable("NOT_FIRST_RIDE", "This coupon is only valid on a customer's first ride.");
            }

            return (coupon, ComputeDiscount(coupon, fareMinor));
        }

        private static int ComputeDiscount(Coupon coupon, int fareMinor)
        {
            int discount = coupon.Type switch
            {
                CouponType.Percentage => (int)Math.Round(fareMinor * (coupon.Value / 100.0)),
                CouponType.Flat => coupon.Value,
                CouponType.FreeRide => coupon.MaxDiscount ?? fareMinor,
                _ => 0,
            };

            if (coupon.Type == CouponType.Percentage && coupon.MaxDiscount is int cap)
                discount = Math.Min(discount, cap);

            return Math.Clamp(discount, 0, fareMinor);
        }
    }
}
