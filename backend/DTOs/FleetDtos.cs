using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    // ---- Owner profile / KYC --------------------------------------------------

    public class FleetProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string? CompanyName { get; set; }
        public string? TradeLicenseNumber { get; set; }
        public string? NidNumber { get; set; }
        public string? BankAccount { get; set; }
        public string VerificationStatus { get; set; } = string.Empty;
        public double? Rating { get; set; }
    }

    /// <summary>Body for POST /fleet/onboarding — submit company/owner KYC.</summary>
    public class FleetOnboardingDto
    {
        [MaxLength(150)] public string? CompanyName { get; set; }
        [Required, MaxLength(64)] public string TradeLicenseNumber { get; set; } = string.Empty;
        [Required, MaxLength(64)] public string NidNumber { get; set; } = string.Empty;
        [MaxLength(64)] public string? BankAccount { get; set; }
    }

    // ---- Fleet drivers (roster) ----------------------------------------------

    /// <summary>A driver in the owner's fleet — membership + the underlying user.</summary>
    public class FleetDriverDto
    {
        public Guid Id { get; set; }
        public Guid DriverId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
        public DateTime InvitedAt { get; set; }
        public UserDto? Driver { get; set; }
    }

    /// <summary>Body for POST /fleet/drivers/invite — add a driver by email/phone.</summary>
    public class FleetDriverInviteDto
    {
        /// <summary>Email or phone of an existing Driver account.</summary>
        [Required] public string EmailOrPhone { get; set; } = string.Empty;
        [MaxLength(280)] public string? Note { get; set; }
    }

    // ---- Rental request approval / terms -------------------------------------

    /// <summary>Body for POST /fleet/rental-requests/{id}/approve.</summary>
    public class ApproveRentalDto
    {
        /// <summary>One of RentType (fixed | revenue-share).</summary>
        [Required] public string RentType { get; set; } = string.Empty;
        /// <summary>Fixed rent per period (minor units) — required for fixed agreements.</summary>
        public int? RentAmountMinor { get; set; }
        /// <summary>Owner's share of fares (0–100) — required for revenue-share agreements.</summary>
        public int? RevenueSharePct { get; set; }
        [MaxLength(280)] public string? Note { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class RejectRentalDto
    {
        [MaxLength(280)] public string? Reason { get; set; }
    }

    /// <summary>Body for PATCH /fleet/rentals/{id}/terms — update rent price/terms.</summary>
    public class UpdateRentalTermsDto
    {
        public string? RentType { get; set; }
        public int? RentAmountMinor { get; set; }
        public int? RevenueSharePct { get; set; }
        [MaxLength(280)] public string? Note { get; set; }
        public DateTime? EndDate { get; set; }
    }

    /// <summary>Rent/revenue-share received from a driver (GET /fleet/rentals/{id}/rent-received).</summary>
    public class RentReceivedDto
    {
        public Guid RentalAgreementId { get; set; }
        public string Currency { get; set; } = "BDT";
        public int TotalReceivedMinor { get; set; }
        public List<RentPaymentDto> Payments { get; set; } = new();
    }

    // ---- Performance & revenue reporting -------------------------------------

    /// <summary>Per-vehicle performance row (GET /fleet/performance).</summary>
    public class VehiclePerformanceDto
    {
        public Guid VehicleId { get; set; }
        public string PlateNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int CompletedTrips { get; set; }
        public int GrossFareMinor { get; set; }
        public int OwnerEarningsMinor { get; set; }
        public Guid? ActiveDriverId { get; set; }
        public double? CurrentLat { get; set; }
        public double? CurrentLng { get; set; }
        public DateTime? LocationUpdatedAt { get; set; }
    }

    /// <summary>Revenue report over a date range (GET /fleet/revenue).</summary>
    public class RevenueReportDto
    {
        public string Currency { get; set; } = "BDT";
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public int CompletedTrips { get; set; }
        public int GrossFareMinor { get; set; }
        /// <summary>Owner cut accrued from rides on fleet vehicles.</summary>
        public int OwnerCutMinor { get; set; }
        /// <summary>Fixed/again rent collected via rent payments in the range.</summary>
        public int RentCollectedMinor { get; set; }
        public int TotalRevenueMinor { get; set; }
    }

    /// <summary>Owner settlement/payout statement line (GET /fleet/settlements).</summary>
    public class SettlementDto
    {
        public string Period { get; set; } = string.Empty;
        public string Currency { get; set; } = "BDT";
        public int RentCollectedMinor { get; set; }
        public int OwnerCutMinor { get; set; }
        public int TotalMinor { get; set; }
    }
}
