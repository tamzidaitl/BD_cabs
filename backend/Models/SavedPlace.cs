using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A customer's saved location — Home, Work, or a custom label
    /// (API_ENDPOINTS.md §10). "Recent" places are derived from ride history, not
    /// stored here.
    /// </summary>
    public class SavedPlace
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }

        [MaxLength(40)] public string Label { get; set; } = string.Empty;
        [MaxLength(512)] public string Address { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
