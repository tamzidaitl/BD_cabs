using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// Promotional coupon. Field set mirrors the frontend `Coupon` interface and
    /// the data model in role_wise_story.md / API_ENDPOINTS.md §7.
    /// `applicableCities` and `applicableRoles` are stored as JSON arrays.
    /// </summary>
    public class Coupon
    {
        public Guid Id { get; set; }

        [MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        /// <summary>One of <see cref="CouponType"/>.</summary>
        [MaxLength(20)]
        public string Type { get; set; } = CouponType.Percentage;

        /// <summary>Percent (for percentage) or minor-unit amount (for flat).</summary>
        public int Value { get; set; }

        /// <summary>Cap on discount in minor units (percentage coupons).</summary>
        public int? MaxDiscount { get; set; }

        /// <summary>Minimum fare (minor units) required to apply.</summary>
        public int? MinFare { get; set; }

        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }

        public int? UsageLimitTotal { get; set; }
        public int? UsageLimitPerUser { get; set; }

        /// <summary>City UUIDs this coupon applies to (JSON column).</summary>
        public List<Guid> ApplicableCities { get; set; } = new();

        /// <summary>Roles this coupon applies to (JSON column).</summary>
        public List<string> ApplicableRoles { get; set; } = new();

        /// <summary>"platform" or "owner" — who absorbs the discount cost.</summary>
        [MaxLength(20)]
        public string CostBorneBy { get; set; } = "platform";

        public bool FirstRideOnly { get; set; }

        /// <summary>One of <see cref="CouponStatus"/>.</summary>
        [MaxLength(20)]
        public string Status { get; set; } = CouponStatus.Active;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
