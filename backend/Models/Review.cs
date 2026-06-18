using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A rating + review tied to a completed ride (API_ENDPOINTS.md §9). A ride can
    /// carry more than one — rider→driver, driver→rider, and (for rental drivers)
    /// driver→owner — distinguished by <see cref="RevieweeType"/>.
    /// </summary>
    public class Review
    {
        public Guid Id { get; set; }

        public Guid RideId { get; set; }
        public Guid ReviewerId { get; set; }
        public Guid RevieweeId { get; set; }

        /// <summary>One of <see cref="ReviewTargetType"/> (Driver | Customer | Owner).</summary>
        [MaxLength(20)] public string RevieweeType { get; set; } = ReviewTargetType.Driver;

        /// <summary>1–5 stars.</summary>
        public int Rating { get; set; }

        [MaxLength(1000)] public string? Comment { get; set; }
        public List<string> Tags { get; set; } = new();

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
