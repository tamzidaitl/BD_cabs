using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A rental relationship between a Vehicle Owner and a rental Driver
    /// (API_ENDPOINTS.md §3 Rental / §4b). A driver requests a vehicle; the owner
    /// approves and sets terms (fixed rent or a revenue-share %). Rent is paid via
    /// <see cref="RentPayment"/>.
    /// </summary>
    public class RentalAgreement
    {
        public Guid Id { get; set; }

        public Guid VehicleId { get; set; }
        public Guid OwnerId { get; set; }
        public Guid DriverId { get; set; }

        /// <summary>One of <see cref="RentalStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = RentalStatus.Requested;

        /// <summary>One of <see cref="RentType"/> (fixed | revenue-share). Set on approval.</summary>
        [MaxLength(20)] public string? RentType { get; set; }
        /// <summary>Fixed rent per period (minor units), for fixed-rent agreements.</summary>
        public int? RentAmountMinor { get; set; }
        /// <summary>Owner's share of fares (0–100), for revenue-share agreements.</summary>
        public int? RevenueSharePct { get; set; }

        [MaxLength(280)] public string? Note { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public DateTime RequestedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>A rent payment from a rental driver to the vehicle owner.</summary>
    public class RentPayment
    {
        public Guid Id { get; set; }
        public Guid RentalAgreementId { get; set; }
        public Guid DriverId { get; set; }
        public Guid OwnerId { get; set; }

        [MaxLength(8)] public string Currency { get; set; } = "BDT";
        public int AmountMinor { get; set; }

        /// <summary>One of <see cref="PaymentStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = PaymentStatus.Paid;

        /// <summary>Period this payment covers, e.g. "2026-06".</summary>
        [MaxLength(20)] public string? Period { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
