using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    // ---- Company profile / KYC / billing -------------------------------------

    public class CorporateProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string? CompanyName { get; set; }
        public string? TradeLicenseNumber { get; set; }
        public string? BillingEmail { get; set; }
        public string? BillingAddress { get; set; }
        public string VerificationStatus { get; set; } = string.Empty;
        public double? Rating { get; set; }
    }

    /// <summary>Body for POST /corporate/onboarding — submit company KYC + billing.</summary>
    public class CorporateOnboardingDto
    {
        [Required, MaxLength(150)] public string CompanyName { get; set; } = string.Empty;
        [Required, MaxLength(64)] public string TradeLicenseNumber { get; set; } = string.Empty;
        [EmailAddress, MaxLength(160)] public string? BillingEmail { get; set; }
        [MaxLength(280)] public string? BillingAddress { get; set; }
    }

    // ---- Employees ------------------------------------------------------------

    public class CorporateEmployeeDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public Guid? UserId { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? MonthlySpendLimitMinor { get; set; }
        public bool RequiresApproval { get; set; }
        /// <summary>This calendar month's completed spend (minor units).</summary>
        public int SpentThisMonthMinor { get; set; }
    }

    /// <summary>Body for POST /corporate/employees and PUT /corporate/employees/{id}.</summary>
    public class CorporateEmployeeInputDto
    {
        [Required, MaxLength(120)] public string FullName { get; set; } = string.Empty;
        [EmailAddress, MaxLength(160)] public string? Email { get; set; }
        [MaxLength(32)] public string? Phone { get; set; }
        public int? MonthlySpendLimitMinor { get; set; }
        public bool RequiresApproval { get; set; }
        /// <summary>One of CorporateEmployeeStatus; defaults to active on create.</summary>
        public string? Status { get; set; }
    }

    // ---- Bookings -------------------------------------------------------------

    public class CorporateBookingDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string VehicleTypeId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        public string? PickupAddress { get; set; }
        public double DestLat { get; set; }
        public double DestLng { get; set; }
        public string? DestAddress { get; set; }
        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }

        public string Currency { get; set; } = "BDT";
        public int FareEstimateMinor { get; set; }
        public int? FinalFareMinor { get; set; }

        public string AllocationMode { get; set; } = string.Empty;
        public Guid? PreferredFleetId { get; set; }
        public bool ApprovalRequired { get; set; }
        public string? RejectionReason { get; set; }
        public string? Notes { get; set; }
        public DateTime? ScheduledFor { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    /// <summary>Body for POST /corporate/bookings/estimate — price a trip before booking.</summary>
    public class CorporateBookingEstimateDto
    {
        [Required] public Guid EmployeeId { get; set; }
        [Required, MaxLength(20)] public string VehicleTypeId { get; set; } = string.Empty;
        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        public double DestLat { get; set; }
        public double DestLng { get; set; }
    }

    /// <summary>Estimate result — fare + whether this booking will need approval.</summary>
    public class CorporateBookingEstimateResultDto
    {
        public string Currency { get; set; } = "BDT";
        public int DistanceMeters { get; set; }
        public int DurationSeconds { get; set; }
        public int FareEstimateMinor { get; set; }
        public bool ApprovalRequired { get; set; }
        public int? MonthlyLimitMinor { get; set; }
        public int SpentThisMonthMinor { get; set; }
        /// <summary>True when this trip would push the employee over their monthly cap.</summary>
        public bool ExceedsLimit { get; set; }
    }

    /// <summary>Body for POST /corporate/bookings — book a ride for an employee.</summary>
    public class CorporateBookingInputDto
    {
        [Required] public Guid EmployeeId { get; set; }
        [Required, MaxLength(20)] public string VehicleTypeId { get; set; } = string.Empty;

        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        [MaxLength(512)] public string? PickupAddress { get; set; }
        public double DestLat { get; set; }
        public double DestLng { get; set; }
        [MaxLength(512)] public string? DestAddress { get; set; }

        /// <summary>One of RideAllocationMode (auto | fleet). Defaults to auto.</summary>
        public string? AllocationMode { get; set; }
        /// <summary>Required when AllocationMode is "fleet".</summary>
        public Guid? PreferredFleetId { get; set; }

        [MaxLength(280)] public string? Notes { get; set; }
        /// <summary>ISO timestamp for an advance booking; omit for an immediate one.</summary>
        public DateTime? ScheduledFor { get; set; }
    }

    public class RejectBookingDto
    {
        [MaxLength(280)] public string? Reason { get; set; }
    }

    // ---- Recurring rides ------------------------------------------------------

    public class CorporateRecurringRideDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string VehicleTypeId { get; set; } = string.Empty;
        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        public string? PickupAddress { get; set; }
        public double DestLat { get; set; }
        public double DestLng { get; set; }
        public string? DestAddress { get; set; }
        public string AllocationMode { get; set; } = string.Empty;
        public Guid? PreferredFleetId { get; set; }
        public List<int> DaysOfWeek { get; set; } = new();
        public string TimeOfDay { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool Active { get; set; }
    }

    public class CorporateRecurringRideInputDto
    {
        [Required] public Guid EmployeeId { get; set; }
        [Required, MaxLength(20)] public string VehicleTypeId { get; set; } = string.Empty;
        public double PickupLat { get; set; }
        public double PickupLng { get; set; }
        [MaxLength(512)] public string? PickupAddress { get; set; }
        public double DestLat { get; set; }
        public double DestLng { get; set; }
        [MaxLength(512)] public string? DestAddress { get; set; }
        public string? AllocationMode { get; set; }
        public Guid? PreferredFleetId { get; set; }
        [Required] public List<int> DaysOfWeek { get; set; } = new();
        [Required, MaxLength(5)] public string TimeOfDay { get; set; } = "08:00";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    // ---- Billing & reporting --------------------------------------------------

    /// <summary>A monthly billing statement line (GET /corporate/billing).</summary>
    public class CorporateStatementDto
    {
        public string Period { get; set; } = string.Empty;
        public string Currency { get; set; } = "BDT";
        public int Trips { get; set; }
        public int AmountMinor { get; set; }
    }

    /// <summary>Company billing summary — current outstanding + monthly statements.</summary>
    public class CorporateBillingDto
    {
        public string Currency { get; set; } = "BDT";
        public string? BillingEmail { get; set; }
        public string? BillingAddress { get; set; }
        /// <summary>Spend for the current calendar month (minor units).</summary>
        public int CurrentMonthMinor { get; set; }
        public int CurrentMonthTrips { get; set; }
        public List<CorporateStatementDto> Statements { get; set; } = new();
    }

    /// <summary>Per-employee row in the consolidated report.</summary>
    public class CorporateEmployeeSpendDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int Trips { get; set; }
        public int SpendMinor { get; set; }
    }

    /// <summary>Per-vehicle-type row in the consolidated report.</summary>
    public class CorporateVehicleTypeSpendDto
    {
        public string VehicleType { get; set; } = string.Empty;
        public int Trips { get; set; }
        public int SpendMinor { get; set; }
    }

    /// <summary>Consolidated trip + spend report over a date range (GET /corporate/reports).</summary>
    public class CorporateReportDto
    {
        public string Currency { get; set; } = "BDT";
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public int TotalTrips { get; set; }
        public int TotalSpendMinor { get; set; }
        public List<CorporateEmployeeSpendDto> ByEmployee { get; set; } = new();
        public List<CorporateVehicleTypeSpendDto> ByVehicleType { get; set; } = new();
    }

    // ---- Reviews of Fleet/Vehicle owners --------------------------------------

    /// <summary>A Fleet/Vehicle Owner the corporate can route to / review.</summary>
    public class CorporateFleetSummaryDto
    {
        public Guid OwnerId { get; set; }
        public string? CompanyName { get; set; }
        public double? Rating { get; set; }
        public int VehicleCount { get; set; }
        /// <summary>True when a rental contract with this owner has completed — gates the review.</summary>
        public bool CanReview { get; set; }
    }

    /// <summary>Body for POST /corporate/reviews — rate a Fleet/Vehicle Owner.</summary>
    public class CorporateReviewInputDto
    {
        [Required] public Guid OwnerId { get; set; }
        [Range(1, 5)] public int Rating { get; set; }
        [MaxLength(1000)] public string? Comment { get; set; }
    }

    // ---- Corporate ↔ Vehicle Owner rental contracts ---------------------------

    /// <summary>
    /// A rental contract between a Corporate Client and a Vehicle Owner. Enrichment
    /// fields are filled per audience: the corporate sees the owner's company name;
    /// the owner sees the renting company; both see the vehicle and assigned drivers.
    /// </summary>
    public class CorporateRentalContractDto
    {
        public Guid Id { get; set; }
        public Guid CorporateId { get; set; }
        public Guid OwnerId { get; set; }
        public Guid VehicleId { get; set; }
        public string Status { get; set; } = string.Empty;

        public string Period { get; set; } = string.Empty;
        public string Currency { get; set; } = "BDT";
        public int? RateMinor { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ServicePurpose { get; set; }
        public string? Notes { get; set; }
        public string? RejectionReason { get; set; }

        public DateTime RequestedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? ActivatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        // ---- Enrichment ----
        public VehicleDto? Vehicle { get; set; }
        /// <summary>The owner's fleet company name (shown to the corporate).</summary>
        public string? OwnerCompanyName { get; set; }
        /// <summary>The renting company's name (shown to the owner).</summary>
        public string? CorporateCompanyName { get; set; }
        /// <summary>Drivers currently assigned to operate the vehicle.</summary>
        public List<CorporateRentalDriverDto> Drivers { get; set; } = new();
        /// <summary>True once the contract has completed — the two parties may review each other.</summary>
        public bool CanReview { get; set; }
    }

    /// <summary>A driver assigned by the owner to a corporate rental contract.</summary>
    public class CorporateRentalDriverDto
    {
        public Guid Id { get; set; }
        public Guid ContractId { get; set; }
        public Guid DriverId { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
        /// <summary>The assigned driver's profile (name, phone, avatar, rating).</summary>
        public RentalDriverDto? Driver { get; set; }
    }

    /// <summary>A rentable owner vehicle a corporate can request (GET /corporate/rental-vehicles).</summary>
    public class CorporateRentalVehicleDto
    {
        public VehicleDto Vehicle { get; set; } = new();
        public Guid OwnerId { get; set; }
        public string? OwnerCompanyName { get; set; }
        public double? OwnerRating { get; set; }
    }

    /// <summary>Body for POST /corporate/rental-contracts — request a vehicle for a service period.</summary>
    public class CorporateRentalRequestDto
    {
        [Required] public Guid VehicleId { get; set; }
        /// <summary>Preferred billing cadence — one of RentalPeriod (daily | weekly | monthly).</summary>
        public string? Period { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        [MaxLength(160)] public string? ServicePurpose { get; set; }
        [MaxLength(280)] public string? Notes { get; set; }
    }
}
