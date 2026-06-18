using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    /// <summary>Body for POST /vehicles — a Fleet/Vehicle Owner registers a vehicle.</summary>
    public class VehicleCreateDto
    {
        [Required, MaxLength(20)] public string Type { get; set; } = string.Empty;
        [Required, MaxLength(40)] public string PlateNumber { get; set; } = string.Empty;
        [MaxLength(60)] public string? Make { get; set; }
        [MaxLength(60)] public string? Model { get; set; }
        [MaxLength(30)] public string? Color { get; set; }
        public int? Year { get; set; }
        [MaxLength(500)] public string? Description { get; set; }

        /// <summary>Stored photo URLs (from POST /vehicles/photos). Required: 1–5 images.</summary>
        [Required, MinLength(1, ErrorMessage = "Upload at least 1 photo."), MaxLength(5, ErrorMessage = "Upload at most 5 photos.")]
        public List<string> PhotoUrls { get; set; } = new();

        /// <summary>Offer this vehicle for rent to drivers.</summary>
        public bool ForRent { get; set; }
        public int? RentalPriceMinor { get; set; }
        /// <summary>Billing cadence — one of RentalPeriod (daily | weekly | monthly).</summary>
        [MaxLength(20)] public string? RentalPeriod { get; set; }
        [MaxLength(280)] public string? RentalTerms { get; set; }
    }

    /// <summary>Body for PUT /vehicles/{id} — edit vehicle details / rental offering.</summary>
    public class VehicleUpdateDto
    {
        [MaxLength(20)] public string? Type { get; set; }
        [MaxLength(40)] public string? PlateNumber { get; set; }
        [MaxLength(60)] public string? Make { get; set; }
        [MaxLength(60)] public string? Model { get; set; }
        [MaxLength(30)] public string? Color { get; set; }
        public int? Year { get; set; }
        [MaxLength(500)] public string? Description { get; set; }
        /// <summary>Replace the photo set (1–5) when provided; omit to leave unchanged.</summary>
        [MaxLength(5, ErrorMessage = "Upload at most 5 photos.")]
        public List<string>? PhotoUrls { get; set; }
        public bool? ForRent { get; set; }
        public int? RentalPriceMinor { get; set; }
        [MaxLength(20)] public string? RentalPeriod { get; set; }
        [MaxLength(280)] public string? RentalTerms { get; set; }
    }

    /// <summary>Response from POST /vehicles/photos — the stored image URL.</summary>
    public class VehiclePhotoUploadResultDto
    {
        public string Url { get; set; } = string.Empty;
    }

    /// <summary>
    /// A vehicle in the Ops verification queue, enriched with the owner who posted it
    /// and its uploaded documents so the reviewer has full context.
    /// </summary>
    public class VehicleVerificationDto
    {
        public VehicleDto Vehicle { get; set; } = new();
        public UserDto? Owner { get; set; }
        public List<VehicleDocumentDto> Documents { get; set; } = new();
    }

    /// <summary>Body for PATCH /vehicles/{id}/status — activate / deactivate / maintenance.</summary>
    public class VehicleStatusDto
    {
        /// <summary>One of VehicleStatus (active | inactive | maintenance).</summary>
        [Required] public string Status { get; set; } = string.Empty;
    }

    public class VehicleDocumentDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string DocumentUrl { get; set; } = string.Empty;
        public string? Number { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string VerificationStatus { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Body for POST /vehicles/{id}/documents.</summary>
    public class VehicleDocumentCreateDto
    {
        [Required, MaxLength(20)] public string Type { get; set; } = string.Empty;
        [Required, MaxLength(512)] public string DocumentUrl { get; set; } = string.Empty;
        [MaxLength(64)] public string? Number { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
