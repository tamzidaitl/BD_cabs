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

        /// <summary>
        /// One of <see cref="Models.AvailabilityMode"/> ("online" | "offline" |
        /// "auto"). The driver's chosen availability strategy; <see cref="IsOnline"/>
        /// is the effective state derived from it.
        /// </summary>
        [MaxLength(16)]
        public string AvailabilityMode { get; set; } = Models.AvailabilityMode.Offline;

        public double? Rating { get; set; }

        [MaxLength(64)]
        public string? LicenseNumber { get; set; }

        /// <summary>True for a rental driver (rents a car from a Vehicle Owner);
        /// false for an owner-driver who drives their own/the platform's car.</summary>
        public bool IsRentalDriver { get; set; }

        /// <summary>Vehicle the driver currently drives (owned or rented).</summary>
        public Guid? ActiveVehicleId { get; set; }

        // ---- Live location (pushed via PATCH /drivers/me/location) ----
        public double? CurrentLat { get; set; }
        public double? CurrentLng { get; set; }
        public DateTime? LocationUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
