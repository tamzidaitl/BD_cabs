using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    /// <summary>Coupon shape returned to clients — matches the frontend `Coupon` interface.</summary>
    public class CouponDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Value { get; set; }
        public int? MaxDiscount { get; set; }
        public int? MinFare { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public int? UsageLimitTotal { get; set; }
        public int? UsageLimitPerUser { get; set; }
        public List<Guid>? ApplicableCities { get; set; }
        public List<string>? ApplicableRoles { get; set; }
        public string CostBorneBy { get; set; } = "platform";
        public bool FirstRideOnly { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Body for POST /coupons (SuperAdmin). Matches the example payload in
    /// API_ENDPOINTS.md §7. Id/timestamps are server-generated.
    /// </summary>
    public class CouponCreateDto
    {
        [Required, MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty;

        [Range(0, int.MaxValue)]
        public int Value { get; set; }

        public int? MaxDiscount { get; set; }
        public int? MinFare { get; set; }

        [Required]
        public DateTime ValidFrom { get; set; }

        [Required]
        public DateTime ValidTo { get; set; }

        public int? UsageLimitTotal { get; set; }
        public int? UsageLimitPerUser { get; set; }
        public List<Guid>? ApplicableCities { get; set; }
        public List<string>? ApplicableRoles { get; set; }

        public string CostBorneBy { get; set; } = "platform";
        public bool FirstRideOnly { get; set; }

        /// <summary>Optional initial status; defaults to "active".</summary>
        public string? Status { get; set; }
    }

    /// <summary>Body for PATCH /coupons/{id}/status — pause/activate/expire.</summary>
    public class CouponStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Body for POST /coupons/apply — validate a code against a prospective fare
    /// (API_ENDPOINTS.md §7). Runs all coupon validation rules and returns the
    /// resulting discount; it does NOT lock a redemption (that happens on ride
    /// completion).
    /// </summary>
    public class ApplyCouponDto
    {
        [Required, MaxLength(40)] public string Code { get; set; } = string.Empty;
        /// <summary>Prospective fare in minor units to validate min-fare and compute the discount.</summary>
        [Range(0, int.MaxValue)] public int FareMinor { get; set; }
        /// <summary>Optional pickup city, checked against the coupon's geo restriction.</summary>
        public Guid? CityId { get; set; }
    }

    /// <summary>Result of a successful coupon apply.</summary>
    public class ApplyCouponResultDto
    {
        public string Code { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int DiscountMinor { get; set; }
        public int FareMinor { get; set; }
        public int PayableMinor { get; set; }
        public string CostBorneBy { get; set; } = "platform";
    }
}
