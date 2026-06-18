using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// Records a coupon being consumed by a customer on a ride (role_wise_story.md →
    /// Coupon System). Locked on ride completion (counts against the per-user and
    /// total quotas) and released on cancellation/refund. Apply-time validation
    /// counts existing locked rows to enforce usage limits.
    /// </summary>
    public class CouponRedemption
    {
        public Guid Id { get; set; }
        public Guid CouponId { get; set; }
        [MaxLength(40)] public string CouponCode { get; set; } = string.Empty;

        public Guid UserId { get; set; }
        public Guid RideId { get; set; }

        public int DiscountMinor { get; set; }

        /// <summary>One of <see cref="CouponRedemptionStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = CouponRedemptionStatus.Locked;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
