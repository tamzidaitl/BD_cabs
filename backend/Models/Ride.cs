using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A single ride/trip — the heart of the Customer and Driver flows
    /// (API_ENDPOINTS.md §5). Money is stored in minor units (paisa) as integers,
    /// per the API money convention; geo points are flattened to lat/lng/address
    /// columns. The fare-split fields are populated on completion.
    /// </summary>
    public class Ride
    {
        public Guid Id { get; set; }

        public Guid CustomerId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? VehicleId { get; set; }

        /// <summary>Requested ride category — one of <see cref="VehicleType"/>.</summary>
        [MaxLength(20)]
        public string VehicleTypeId { get; set; } = Models.VehicleType.Car;

        /// <summary>One of <see cref="RideStatus"/>.</summary>
        [MaxLength(20)]
        public string Status { get; set; } = RideStatus.Requested;

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
        public int DiscountMinor { get; set; }
        [MaxLength(40)] public string? CouponCode { get; set; }

        [MaxLength(20)] public string PaymentMethod { get; set; } = PaymentMethodType.Cash;

        /// <summary>Fare-split snapshot, set on completion (minor units).</summary>
        public int PlatformCommissionMinor { get; set; }
        public int OwnerCutMinor { get; set; }
        public int DriverEarningsMinor { get; set; }

        /// <summary>6-digit code the rider gives the driver at pickup (verified at /start).</summary>
        [MaxLength(8)] public string? StartOtp { get; set; }

        [MaxLength(280)] public string? Notes { get; set; }

        /// <summary>Set for advance bookings; null for instant rides.</summary>
        public DateTime? ScheduledFor { get; set; }

        /// <summary>Set when this ride was spawned from a recurring schedule.</summary>
        public Guid? RecurringRideId { get; set; }

        // ---- Cancellation ----
        [MaxLength(20)] public string? CancelledBy { get; set; }   // one of RideParty
        [MaxLength(280)] public string? CancelReason { get; set; }
        public int CancellationFeeMinor { get; set; }

        // ---- Lifecycle timestamps ----
        public DateTime RequestedAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public DateTime? ArrivedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// A recurring ride schedule (e.g. daily commute). The matching/dispatch job
    /// materialises concrete <see cref="Ride"/> rows from active schedules; this
    /// slice persists and manages the schedule itself (API_ENDPOINTS.md §5).
    /// </summary>
    public class RecurringRide
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }

        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        [MaxLength(512)] public string? PickupAddress { get; set; }

        public double DestLat { get; set; }
        public double DestLng { get; set; }
        [MaxLength(512)] public string? DestAddress { get; set; }

        [MaxLength(20)] public string VehicleTypeId { get; set; } = Models.VehicleType.Car;
        [MaxLength(20)] public string PaymentMethod { get; set; } = PaymentMethodType.Cash;

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
