using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A ride a corporate books for one of its employees (role_wise_story.md §4).
    /// Money is in minor units (poisha). Allocation is either platform-auto or
    /// routed to a chosen Fleet/Vehicle Owner (<see cref="PreferredFleetId"/>).
    /// Completed bookings are what billing and the consolidated reports count.
    /// </summary>
    public class CorporateBooking
    {
        public Guid Id { get; set; }

        public Guid CorporateId { get; set; }
        public Guid EmployeeId { get; set; }

        /// <summary>Requested ride category — one of <see cref="VehicleType"/>.</summary>
        [MaxLength(20)] public string VehicleTypeId { get; set; } = Models.VehicleType.Car;

        /// <summary>One of <see cref="CorporateBookingStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = CorporateBookingStatus.Approved;

        // ---- Pickup / destination ----
        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        [MaxLength(512)] public string? PickupAddress { get; set; }

        public double DestLat { get; set; }
        public double DestLng { get; set; }
        [MaxLength(512)] public string? DestAddress { get; set; }

        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }

        // ---- Money (minor units) ----
        [MaxLength(8)] public string Currency { get; set; } = "BDT";
        public int FareEstimateMinor { get; set; }
        public int? FinalFareMinor { get; set; }

        // ---- Allocation ----
        /// <summary>One of <see cref="RideAllocationMode"/> (auto | fleet).</summary>
        [MaxLength(20)] public string AllocationMode { get; set; } = RideAllocationMode.Auto;
        /// <summary>The chosen Fleet/Vehicle Owner when <see cref="AllocationMode"/> is fleet.</summary>
        public Guid? PreferredFleetId { get; set; }

        /// <summary>True when this booking went through the approval queue.</summary>
        public bool ApprovalRequired { get; set; }
        [MaxLength(280)] public string? RejectionReason { get; set; }

        [MaxLength(280)] public string? Notes { get; set; }

        /// <summary>Set for advance bookings; null for an immediate booking.</summary>
        public DateTime? ScheduledFor { get; set; }

        /// <summary>Set when this booking was spawned from a recurring schedule.</summary>
        public Guid? RecurringId { get; set; }

        // ---- Lifecycle timestamps ----
        public DateTime RequestedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// A recurring corporate ride schedule for an employee (e.g. daily commute,
    /// role_wise_story.md §4). The schedule itself is persisted/managed here; a
    /// real deployment's dispatch job materialises concrete bookings from it.
    /// </summary>
    public class CorporateRecurringRide
    {
        public Guid Id { get; set; }

        public Guid CorporateId { get; set; }
        public Guid EmployeeId { get; set; }

        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        [MaxLength(512)] public string? PickupAddress { get; set; }

        public double DestLat { get; set; }
        public double DestLng { get; set; }
        [MaxLength(512)] public string? DestAddress { get; set; }

        [MaxLength(20)] public string VehicleTypeId { get; set; } = Models.VehicleType.Car;

        /// <summary>One of <see cref="RideAllocationMode"/> (auto | fleet).</summary>
        [MaxLength(20)] public string AllocationMode { get; set; } = RideAllocationMode.Auto;
        public Guid? PreferredFleetId { get; set; }

        /// <summary>Days of week the ride repeats: 0 = Sunday … 6 = Saturday.</summary>
        public List<int> DaysOfWeek { get; set; } = new();

        /// <summary>Local pickup time, "HH:mm".</summary>
        [MaxLength(5)] public string TimeOfDay { get; set; } = "08:00";

        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool Active { get; set; } = true;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
