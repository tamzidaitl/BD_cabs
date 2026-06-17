using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// Driver-specific data attached to a <see cref="User"/> whose role is Driver.
    /// Used by the Ops "pending drivers" queue (KYC verification workflow).
    /// </summary>
    public class DriverProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }

        /// <summary>One of <see cref="VerificationStatus"/>.</summary>
        [MaxLength(32)]
        public string VerificationStatus { get; set; } = Models.VerificationStatus.Pending;

        public bool IsOnline { get; set; }
        public double? Rating { get; set; }

        [MaxLength(64)]
        public string? LicenseNumber { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
