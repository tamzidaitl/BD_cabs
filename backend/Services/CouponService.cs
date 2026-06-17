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
    }
}
