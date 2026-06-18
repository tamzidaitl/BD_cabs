using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// Fleet/Vehicle Owner business profile and KYC (API_ENDPOINTS.md §4b). Attached
    /// to a <see cref="User"/> whose role is FleetOwner. Until verified the owner is
    /// <see cref="AccountStatus.Pending"/> and cannot transact.
    /// </summary>
    public class FleetProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }

        [MaxLength(150)] public string? CompanyName { get; set; }
        [MaxLength(64)] public string? TradeLicenseNumber { get; set; }
        [MaxLength(64)] public string? NidNumber { get; set; }
        [MaxLength(64)] public string? BankAccount { get; set; }

        /// <summary>One of <see cref="VerificationStatus"/>.</summary>
        [MaxLength(20)] public string VerificationStatus { get; set; } = Models.VerificationStatus.Pending;

        /// <summary>Aggregate rating the owner has received (rider/driver reviews).</summary>
        public double? Rating { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Membership of a Driver in an owner's fleet (API_ENDPOINTS.md §4b
    /// /fleet/drivers). Distinct from a <see cref="RentalAgreement"/>: membership is
    /// the roster, an agreement is the per-vehicle rental relationship.
    /// </summary>
    public class FleetDriver
    {
        public Guid Id { get; set; }

        public Guid OwnerId { get; set; }
        public Guid DriverId { get; set; }

        /// <summary>One of <see cref="FleetDriverStatus"/> (active | removed).</summary>
        [MaxLength(20)] public string Status { get; set; } = FleetDriverStatus.Active;

        [MaxLength(280)] public string? Note { get; set; }

        public DateTime InvitedAt { get; set; }
        public DateTime? RemovedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
