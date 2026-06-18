using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A document attached to a <see cref="Vehicle"/> by its Fleet/Vehicle Owner —
    /// registration papers, insurance, fitness certificate, etc.
    /// (API_ENDPOINTS.md §4). Each upload is re-verified by Ops; <see cref="ExpiresAt"/>
    /// drives the owner-side expiry tracking for papers/insurance/fitness.
    /// </summary>
    public class VehicleDocument
    {
        public Guid Id { get; set; }

        public Guid VehicleId { get; set; }

        /// <summary>User id of the owning FleetOwner (denormalised for ownership checks).</summary>
        public Guid OwnerId { get; set; }

        /// <summary>One of <see cref="DocumentType"/> (registration | insurance | fitness | other).</summary>
        [MaxLength(20)] public string Type { get; set; } = DocumentType.Registration;

        [MaxLength(512)] public string DocumentUrl { get; set; } = string.Empty;
        [MaxLength(64)] public string? Number { get; set; }
        public DateTime? ExpiresAt { get; set; }

        /// <summary>One of <see cref="VerificationStatus"/>.</summary>
        [MaxLength(20)] public string VerificationStatus { get; set; } = Models.VerificationStatus.Pending;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
