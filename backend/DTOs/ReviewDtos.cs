using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class ReviewDto
    {
        public Guid Id { get; set; }
        /// <summary>The ride this review is about; null for rental-agreement reviews.</summary>
        public Guid? RideId { get; set; }
        /// <summary>The rental agreement this review is about; null for ride reviews.</summary>
        public Guid? RentalAgreementId { get; set; }
        public Guid ReviewerId { get; set; }
        /// <summary>Display name of who left the review (e.g. the rider who rated a driver).
        /// Populated for the "your rating &amp; reviews" surface; may be null elsewhere.</summary>
        public string? ReviewerName { get; set; }
        /// <summary>Avatar of who left the review, for the "your rating &amp; reviews"
        /// surface; null when the reviewer has no avatar or it isn't populated.</summary>
        public string? ReviewerAvatarUrl { get; set; }
        public Guid RevieweeId { get; set; }
        public string RevieweeType { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public List<string> Tags { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Body for POST /reviews (rider→driver, driver→rider, driver→owner).</summary>
    public class ReviewCreateDto
    {
        [Required] public Guid RideId { get; set; }
        [Range(1, 5)] public int Rating { get; set; }
        [MaxLength(1000)] public string? Comment { get; set; }
        public List<string>? Tags { get; set; }

        /// <summary>Who is being rated — one of ReviewTargetType (Driver | Customer | Owner).
        /// Defaults based on the reviewer's role when omitted.</summary>
        public string? RevieweeType { get; set; }
    }

    /// <summary>Body for POST /reviews/rental/{agreementId} — a rental driver rates the
    /// car they rented or its Fleet Owner once the agreement has ended.</summary>
    public class RentalReviewCreateDto
    {
        [Range(1, 5)] public int Rating { get; set; }
        [MaxLength(1000)] public string? Comment { get; set; }
        public List<string>? Tags { get; set; }

        /// <summary>Who is being rated — one of ReviewTargetType (Vehicle | Owner).</summary>
        [Required] public string RevieweeType { get; set; } = string.Empty;
    }

    /// <summary>Aggregate rating for a driver (GET /drivers/{id}/rating).</summary>
    public class RatingSummaryDto
    {
        public Guid UserId { get; set; }
        public double Average { get; set; }
        public int Count { get; set; }
    }

    /// <summary>The signed-in user's own rating summary + received review history
    /// (GET /reviews/me). Powers the "your rating &amp; reviews" profile surface.</summary>
    public class ProfileReviewsDto
    {
        public RatingSummaryDto Summary { get; set; } = new();
        public List<ReviewDto> Reviews { get; set; } = new();
    }

    /// <summary>
    /// A review as seen by a moderator (GET /ops/reviews). Adds the moderation
    /// state and the human names of both parties so staff can judge it in context.
    /// </summary>
    public class AdminReviewDto
    {
        public Guid Id { get; set; }
        public Guid? RideId { get; set; }
        public Guid? RentalAgreementId { get; set; }
        public Guid ReviewerId { get; set; }
        public string? ReviewerName { get; set; }
        public Guid RevieweeId { get; set; }
        public string? RevieweeName { get; set; }
        public string RevieweeType { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public List<string> Tags { get; set; } = new();
        /// <summary>One of ReviewStatus (Visible | Hidden | Removed).</summary>
        public string Status { get; set; } = string.Empty;
        public Guid? ModeratedBy { get; set; }
        public DateTime? ModeratedAt { get; set; }
        public string? ModerationReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>Body for PATCH /ops/reviews/{id} — hide, unhide, or remove a review.</summary>
    public class ReviewModerationDto
    {
        /// <summary>One of ReviewModerationAction (hide | unhide | remove).</summary>
        [Required] public string Action { get; set; } = string.Empty;
        [MaxLength(280)] public string? Reason { get; set; }
    }
}
