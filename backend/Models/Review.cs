using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A rating + review (API_ENDPOINTS.md §9). Most are tied to a completed ride —
    /// rider→driver, driver→rider, and (for rental drivers) driver→owner. A rental
    /// driver also rates the car and its Fleet Owner once a rental agreement ends;
    /// those are tied to <see cref="RentalAgreementId"/> instead of a ride. Exactly
    /// one of <see cref="RideId"/> / <see cref="RentalAgreementId"/> is set.
    /// </summary>
    public class Review
    {
        public Guid Id { get; set; }

        /// <summary>The ride this review is about, for ride-based reviews; null for
        /// rental-agreement reviews (see <see cref="RentalAgreementId"/>).</summary>
        public Guid? RideId { get; set; }
        /// <summary>The rental agreement this review is about, for rental reviews
        /// (driver→vehicle, driver→owner); null for ride-based reviews.</summary>
        public Guid? RentalAgreementId { get; set; }
        public Guid ReviewerId { get; set; }
        public Guid RevieweeId { get; set; }

        /// <summary>One of <see cref="ReviewTargetType"/> (Driver | Customer | Owner | Vehicle | Corporate).</summary>
        [MaxLength(20)] public string RevieweeType { get; set; } = ReviewTargetType.Driver;

        /// <summary>1–5 stars.</summary>
        public int Rating { get; set; }

        [MaxLength(1000)] public string? Comment { get; set; }
        public List<string> Tags { get; set; } = new();

        // ---- Moderation (Super Admin / Support Admin) ----
        /// <summary>One of <see cref="ReviewStatus"/>. Hidden/Removed reviews are kept
        /// out of public listings and rating averages.</summary>
        [MaxLength(20)] public string Status { get; set; } = ReviewStatus.Visible;
        /// <summary>The staff user who last moderated this review.</summary>
        public Guid? ModeratedBy { get; set; }
        public DateTime? ModeratedAt { get; set; }
        [MaxLength(280)] public string? ModerationReason { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
