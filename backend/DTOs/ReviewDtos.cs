using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class ReviewDto
    {
        public Guid Id { get; set; }
        public Guid RideId { get; set; }
        public Guid ReviewerId { get; set; }
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

    /// <summary>Aggregate rating for a driver (GET /drivers/{id}/rating).</summary>
    public class RatingSummaryDto
    {
        public Guid UserId { get; set; }
        public double Average { get; set; }
        public int Count { get; set; }
    }
}
