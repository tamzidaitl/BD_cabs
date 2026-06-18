using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class DriverProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string VerificationStatus { get; set; } = string.Empty;
        public bool IsOnline { get; set; }
        /// <summary>"online" | "offline" | "auto".</summary>
        public string AvailabilityMode { get; set; } = string.Empty;
        public double? Rating { get; set; }
        public bool IsRentalDriver { get; set; }
        public Guid? ActiveVehicleId { get; set; }
        public double? CurrentLat { get; set; }
        public double? CurrentLng { get; set; }
        public string? LicenseNumber { get; set; }
    }

    public class DriverOnboardingDto
    {
        [Required, MaxLength(64)] public string LicenseNumber { get; set; } = string.Empty;
        /// <summary>True if this driver rents a vehicle from an owner.</summary>
        public bool IsRentalDriver { get; set; }
    }

    public class DriverUpdateDto
    {
        [MaxLength(64)] public string? LicenseNumber { get; set; }
        public bool? IsRentalDriver { get; set; }
        public Guid? ActiveVehicleId { get; set; }
    }

    public class AvailabilityDto
    {
        /// <summary>
        /// Legacy boolean toggle (still sent by the driver Drive switch). When
        /// <see cref="Mode"/> is omitted this maps to "online"/"offline".
        /// </summary>
        public bool IsOnline { get; set; }

        /// <summary>
        /// Optional explicit mode ("online" | "offline" | "auto"). When present it
        /// takes precedence over <see cref="IsOnline"/>.
        /// </summary>
        [MaxLength(16)] public string? Mode { get; set; }
    }

    public class DriverLocationDto
    {
        [Range(-90, 90)] public double Lat { get; set; }
        [Range(-180, 180)] public double Lng { get; set; }
    }

    public class DriverEarningsDto
    {
        public string Currency { get; set; } = "BDT";
        public int TodayMinor { get; set; }
        public int WeekMinor { get; set; }
        public int TotalMinor { get; set; }
        public int CompletedTrips { get; set; }
        public int WalletBalanceMinor { get; set; }
    }

    public class DriverDocumentDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string DocumentUrl { get; set; } = string.Empty;
        public string? Number { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string VerificationStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class DriverDocumentCreateDto
    {
        /// <summary>One of DocumentType (license, nid, insurance, fitness, registration, other).</summary>
        [Required] public string Type { get; set; } = string.Empty;
        [Required, MaxLength(512)] public string DocumentUrl { get; set; } = string.Empty;
        [MaxLength(64)] public string? Number { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
