using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class SavedPlaceDto
    {
        public Guid Id { get; set; }
        public string Label { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SavedPlaceCreateDto
    {
        [Required, MaxLength(40)] public string Label { get; set; } = string.Empty;
        [Required, MaxLength(512)] public string Address { get; set; } = string.Empty;
        [Range(-90, 90)] public double Lat { get; set; }
        [Range(-180, 180)] public double Lng { get; set; }
    }

    /// <summary>A recently used location, derived from ride history.</summary>
    public class RecentPlaceDto
    {
        public string Address { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public DateTime UsedAt { get; set; }
    }
}
