using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    /// <summary>A lat/lng (+ optional address), mirroring the frontend `GeoPoint`.</summary>
    public class GeoPointDto
    {
        [Range(-90, 90)] public double Lat { get; set; }
        [Range(-180, 180)] public double Lng { get; set; }
        [MaxLength(512)] public string? Address { get; set; }
    }

    // ---- Inputs ---------------------------------------------------------------

    public class RideEstimateDto
    {
        [Required] public GeoPointDto Pickup { get; set; } = new();
        [Required] public GeoPointDto Destination { get; set; } = new();
        [Required] public string VehicleTypeId { get; set; } = string.Empty;
    }

    public class RideRequestDto
    {
        [Required] public GeoPointDto Pickup { get; set; } = new();
        [Required] public GeoPointDto Destination { get; set; } = new();
        [Required] public string VehicleTypeId { get; set; } = string.Empty;

        /// <summary>One of PaymentMethodType (Cash, Card, bKash, Nagad, Wallet).</summary>
        public string PaymentMethod { get; set; } = "Cash";
        [MaxLength(40)] public string? CouponCode { get; set; }
        [MaxLength(280)] public string? Notes { get; set; }

        /// <summary>Set for an advance booking; omit for an instant ride.</summary>
        public DateTime? ScheduledFor { get; set; }
    }

    public class CancelRideDto
    {
        [MaxLength(280)] public string? Reason { get; set; }
    }

    public class StartRideDto
    {
        [Required, MaxLength(8)] public string Otp { get; set; } = string.Empty;
    }

    public class RecurringRideCreateDto
    {
        [Required] public GeoPointDto Pickup { get; set; } = new();
        [Required] public GeoPointDto Destination { get; set; } = new();
        [Required] public string VehicleTypeId { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = "Cash";

        /// <summary>Days of week to repeat: 0 = Sunday … 6 = Saturday.</summary>
        [Required, MinLength(1)] public List<int> DaysOfWeek { get; set; } = new();
        [Required] public string TimeOfDay { get; set; } = "08:00";
        [Required] public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    // ---- Outputs --------------------------------------------------------------

    public class RideDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? VehicleId { get; set; }
        public string VehicleTypeId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        public GeoPointDto Pickup { get; set; } = new();
        public GeoPointDto Destination { get; set; } = new();

        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }

        public string Currency { get; set; } = "BDT";
        public int FareEstimateMinor { get; set; }
        public int? FinalFareMinor { get; set; }
        public int DiscountMinor { get; set; }
        public string? CouponCode { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;

        /// <summary>Settlement state of the ride charge — one of PaymentStatus
        /// (Pending until the rider pays, then Paid). Persisted server-side so the
        /// UI can show a durable "Paid" state instead of relying on transient
        /// client mutation state.</summary>
        public string PaymentStatus { get; set; } = Models.PaymentStatus.Pending;
        /// <summary>Amount actually charged (minor units); set once paid.</summary>
        public int? AmountPaidMinor { get; set; }
        /// <summary>When the ride charge settled; null until paid.</summary>
        public DateTime? PaidAt { get; set; }

        public string? Notes { get; set; }
        public DateTime? ScheduledFor { get; set; }

        /// <summary>The trip start code. Surfaced only to the rider (on their own ride
        /// detail) so they can read it out to the driver; null for everyone else,
        /// including the driver, so the code stays the rider's secret.</summary>
        public string? StartOtp { get; set; }

        /// <summary>Customer summary (name + avatar) so the driver can see who is
        /// requesting. Populated for the driver's nearby-requests feed; null elsewhere.</summary>
        public RideCustomerDto? Customer { get; set; }

        public string? CancelledBy { get; set; }
        public string? CancelReason { get; set; }
        public int CancellationFeeMinor { get; set; }

        public DateTime RequestedAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public DateTime? ArrivedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        /// <summary>Stars (1–5) the customer gave the driver for this ride, if rated.
        /// Populated on the customer's own ride history so the list can show which
        /// completed rides have been rated; null when not yet rated.</summary>
        public int? CustomerRating { get; set; }

        /// <summary>Stars (1–5) the driver gave the passenger for this trip, if rated.
        /// Populated on the driver's own trip history so the list can mark which
        /// completed trips the driver has already rated; null when not yet rated.</summary>
        public int? DriverRating { get; set; }
    }

    /// <summary>Result of POST /rides/request — the created ride plus the start OTP
    /// the rider must share with the driver to begin the trip.</summary>
    public class RideCreatedDto
    {
        public RideDto Ride { get; set; } = new();
        /// <summary>6-digit code; the rider gives this to the driver at pickup.</summary>
        public string? StartOtp { get; set; }
    }

    public class FareEstimateResultDto
    {
        public string Currency { get; set; } = "BDT";
        public int FareEstimateMinor { get; set; }
        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }
        public int EtaSeconds { get; set; }
    }

    /// <summary>
    /// A driving route traced along the road network (the line a map draws for a
    /// trip). Returned by the route proxy so the client never calls the routing
    /// provider directly.
    /// </summary>
    public class RoutePathDto
    {
        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }
        /// <summary>Ordered [lat, lng] points tracing the route along roads.</summary>
        public List<double[]> Coordinates { get; set; } = new();
    }

    public class RideTrackDto
    {
        public Guid RideId { get; set; }
        public string Status { get; set; } = string.Empty;
        public double? DriverLat { get; set; }
        public double? DriverLng { get; set; }
        public int? EtaSeconds { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class FareSplitDto
    {
        public int PlatformCommissionMinor { get; set; }
        public int OwnerCutMinor { get; set; }
        public int DriverEarningsMinor { get; set; }
        public int CouponCostMinor { get; set; }
        public string CouponCostBorneBy { get; set; } = "platform";
    }

    public class FareBreakdownDto
    {
        public Guid RideId { get; set; }
        public string Currency { get; set; } = "BDT";
        public int BaseFareMinor { get; set; }
        public int DistanceFareMinor { get; set; }
        public int TimeFareMinor { get; set; }
        public int SurgeMinor { get; set; }
        public int DiscountMinor { get; set; }
        public int TotalMinor { get; set; }
        public FareSplitDto Split { get; set; } = new();
    }

    /// <summary>Lightweight customer profile attached to a ride for the driver's view.</summary>
    public class RideCustomerDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }

    public class NearbyVehicleDto
    {
        public Guid DriverId { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public int DistanceMeters { get; set; }
        public int EtaSeconds { get; set; }
        public double? Rating { get; set; }
    }

    // ---- Ops / Admin overview -------------------------------------------------

    /// <summary>A ride party (customer or driver) summarised for the ops rides table.</summary>
    public class AdminRidePartyDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
    }

    /// <summary>The car assigned to a ride, summarised for the ops rides table.</summary>
    public class AdminRideVehicleDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string? Make { get; set; }
        public string? Model { get; set; }
        public string? Color { get; set; }
        public int? Year { get; set; }
        /// <summary>Operational state — one of VehicleStatus.</summary>
        public string Status { get; set; } = string.Empty;
        /// <summary>One of VerificationStatus.</summary>
        public string VerificationStatus { get; set; } = string.Empty;
    }

    /// <summary>
    /// An enriched ride row for the Support/Super Admin rides console: who is
    /// riding with whom, the pickup/destination, the assigned car, and any
    /// problems flagged on the trip (SOS alert, cancellation, no driver, unverified car).
    /// </summary>
    public class AdminRideDto
    {
        public Guid Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public string VehicleTypeId { get; set; } = string.Empty;

        public AdminRidePartyDto Customer { get; set; } = new();
        public AdminRidePartyDto? Driver { get; set; }
        public AdminRideVehicleDto? Vehicle { get; set; }

        public GeoPointDto Pickup { get; set; } = new();
        public GeoPointDto Destination { get; set; } = new();

        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }

        public string Currency { get; set; } = "BDT";
        public int FareEstimateMinor { get; set; }
        public int? FinalFareMinor { get; set; }
        public int DiscountMinor { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;

        /// <summary>Settlement state of the ride charge — one of PaymentStatus.</summary>
        public string PaymentStatus { get; set; } = Models.PaymentStatus.Pending;
        /// <summary>Amount actually charged (minor units); set once paid.</summary>
        public int? AmountPaidMinor { get; set; }
        /// <summary>When the ride charge settled; null until paid.</summary>
        public DateTime? PaidAt { get; set; }

        public string? CancelledBy { get; set; }
        public string? CancelReason { get; set; }

        /// <summary>Human-readable problems flagged on this ride; empty when all is well.</summary>
        public List<string> Problems { get; set; } = new();

        public DateTime RequestedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
    }

    public class RecurringRideDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public GeoPointDto Pickup { get; set; } = new();
        public GeoPointDto Destination { get; set; } = new();
        public string VehicleTypeId { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public List<int> DaysOfWeek { get; set; } = new();
        public string TimeOfDay { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool Active { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
