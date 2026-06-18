using BdCabs.Api.DTOs;
using BdCabs.Api.Models;

namespace BdCabs.Api.Interfaces
{
    public interface ICouponService
    {
        Task<List<CouponDto>> ListAll();
        Task<CouponDto> Create(CouponCreateDto dto);
        Task<CouponDto> SetStatus(Guid id, string status);

        /// <summary>List coupons available to the given user (active + role-eligible).</summary>
        Task<List<CouponDto>> ListAvailable(Guid userId, string role);

        /// <summary>Validate a code for the current user and return the computed discount.</summary>
        Task<ApplyCouponResultDto> Apply(Guid userId, ApplyCouponDto dto);

        /// <summary>
        /// Validate a code at booking time and return the matched coupon + discount,
        /// or throw an AppException with a stable coupon error code. Used by the ride
        /// flow to stamp the discount onto the ride.
        /// </summary>
        Task<(Coupon coupon, int discountMinor)> ValidateForRide(string code, Guid userId, int fareMinor);

        /// <summary>Lock a redemption against a completed ride (counts toward quotas).</summary>
        Task LockRedemption(Guid couponId, string code, Guid userId, Guid rideId, int discountMinor);

        /// <summary>Release any redemption tied to a ride (on cancellation/refund).</summary>
        Task ReleaseRedemption(Guid rideId);
    }
}
