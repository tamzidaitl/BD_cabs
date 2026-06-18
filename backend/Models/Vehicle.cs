using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A vehicle owned by a Fleet/Vehicle Owner or an owner-driver
    /// (API_ENDPOINTS.md §4). Owners may offer a vehicle for rent to drivers; the
    /// rental relationship itself lives in <see cref="RentalAgreement"/>.
    /// </summary>
    public class Vehicle
    {
        public Guid Id { get; set; }

        /// <summary>User id of the owning FleetOwner or owner-driver.</summary>
        public Guid OwnerId { get; set; }

        /// <summary>Ride category — one of <see cref="VehicleType"/>.</summary>
        [MaxLength(20)] public string Type { get; set; } = Models.VehicleType.Car;

        [MaxLength(40)] public string PlateNumber { get; set; } = string.Empty;
        [MaxLength(60)] public string? Make { get; set; }
        [MaxLength(60)] public string? Model { get; set; }
        [MaxLength(30)] public string? Color { get; set; }
        public int? Year { get; set; }

        /// <summary>Owner-written description / notes shown to the verification reviewer.</summary>
        [MaxLength(500)] public string? Description { get; set; }

        /// <summary>Owner-uploaded cover photo (first of <see cref="PhotoUrls"/>).</summary>
        [MaxLength(512)] public string? PhotoUrl { get; set; }

        /// <summary>
        /// Owner-uploaded vehicle photos (1–5 required at registration). Npgsql maps
        /// List&lt;string&gt; to a native text[] column. <see cref="PhotoUrl"/> mirrors
        /// the first entry as the cover image.
        /// </summary>
        public List<string> PhotoUrls { get; set; } = new();

        /// <summary>One of <see cref="VerificationStatus"/>.</summary>
        [MaxLength(20)] public string VerificationStatus { get; set; } = Models.VerificationStatus.Pending;

        /// <summary>
        /// Operational state — one of <see cref="VehicleStatus"/> (active | inactive |
        /// maintenance). <see cref="IsActive"/> is the effective "available for rides"
        /// flag derived from it (true only when Status == active and verified).
        /// </summary>
        [MaxLength(20)] public string Status { get; set; } = Models.VehicleStatus.Inactive;
        public bool IsActive { get; set; }

        // ---- Rental offering ----
        /// <summary>True when the owner is offering this vehicle for rent to drivers.</summary>
        public bool ForRent { get; set; }
        /// <summary>Asking rent (minor units) for fixed-rent offers.</summary>
        public int? RentalPriceMinor { get; set; }
        [MaxLength(280)] public string? RentalTerms { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
