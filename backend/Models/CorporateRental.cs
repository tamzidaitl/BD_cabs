using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A rental contract under which a Vehicle Owner rents one of their vehicles to
    /// a Corporate Client for a service period (role_wise_story.md §4 — Corporate ↔
    /// Vehicle Owner). The corporate requests a rentable vehicle; the owner approves
    /// and sets the rate/period, assigns one or more of their roster drivers to
    /// operate it, runs the service period, then completes it. Once a contract has
    /// completed, the two parties may rate each other. Money is in minor units.
    /// </summary>
    public class CorporateRentalContract
    {
        public Guid Id { get; set; }

        /// <summary>The renting company (a <see cref="User"/> with the Corporate role).</summary>
        public Guid CorporateId { get; set; }
        /// <summary>The vehicle owner (a <see cref="User"/> with the FleetOwner role).</summary>
        public Guid OwnerId { get; set; }
        public Guid VehicleId { get; set; }

        /// <summary>One of <see cref="CorporateRentalStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = CorporateRentalStatus.Requested;

        // ---- Terms (rate set by the owner on approval) ----
        /// <summary>Billing cadence — one of <see cref="RentalPeriod"/> (daily | weekly | monthly).</summary>
        [MaxLength(20)] public string Period { get; set; } = Models.RentalPeriod.Monthly;
        [MaxLength(8)] public string Currency { get; set; } = "BDT";
        /// <summary>Rate per <see cref="Period"/> (minor units); set when the owner approves.</summary>
        public int? RateMinor { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        /// <summary>What the corporate needs the vehicle for, e.g. "employee shuttle".</summary>
        [MaxLength(160)] public string? ServicePurpose { get; set; }
        [MaxLength(280)] public string? Notes { get; set; }
        [MaxLength(280)] public string? RejectionReason { get; set; }

        // ---- Lifecycle timestamps ----
        public DateTime RequestedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? ActivatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// A driver the Vehicle Owner has assigned to operate a vehicle for the duration
    /// of a <see cref="CorporateRentalContract"/>. An owner may assign more than one
    /// driver to a contract; assignments are drawn from the owner's fleet roster.
    /// </summary>
    public class CorporateRentalDriver
    {
        public Guid Id { get; set; }

        public Guid ContractId { get; set; }
        /// <summary>Denormalised owner id so assignments scope cheaply to an owner.</summary>
        public Guid OwnerId { get; set; }
        public Guid DriverId { get; set; }

        /// <summary>One of <see cref="CorporateRentalDriverStatus"/> (assigned | unassigned).</summary>
        [MaxLength(20)] public string Status { get; set; } = CorporateRentalDriverStatus.Assigned;

        public DateTime AssignedAt { get; set; }
        public DateTime? UnassignedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
