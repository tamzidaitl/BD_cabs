using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    // ---- Vehicles ----

    public class VehicleDto
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string? Make { get; set; }
        public string? Model { get; set; }
        public string? Color { get; set; }
        public int? Year { get; set; }
        public string? Description { get; set; }
        public string? PhotoUrl { get; set; }
        public List<string> PhotoUrls { get; set; } = new();
        public string VerificationStatus { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool ForRent { get; set; }
        public int? RentalPriceMinor { get; set; }
        public string? RentalTerms { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ---- Rental agreements ----

    public class RentalAgreementDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid OwnerId { get; set; }
        public Guid DriverId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? RentType { get; set; }
        public int? RentAmountMinor { get; set; }
        public int? RevenueSharePct { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
    }

    /// <summary>Body for POST /rentals/requests — a driver requests a vehicle.</summary>
    public class RentalRequestDto
    {
        [Required] public Guid VehicleId { get; set; }
        [MaxLength(280)] public string? Note { get; set; }
    }

    /// <summary>Rent owed on an agreement (GET /rentals/{id}/rent-due).</summary>
    public class RentDueDto
    {
        public Guid RentalAgreementId { get; set; }
        public string Currency { get; set; } = "BDT";
        public int AmountDueMinor { get; set; }
        public string RentType { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
    }

    /// <summary>Body for POST /rentals/{id}/pay-rent.</summary>
    public class PayRentDto
    {
        [Range(1, int.MaxValue)] public int AmountMinor { get; set; }
        [MaxLength(20)] public string? Period { get; set; }
    }

    public class RentPaymentDto
    {
        public Guid Id { get; set; }
        public Guid RentalAgreementId { get; set; }
        public string Currency { get; set; } = "BDT";
        public int AmountMinor { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Period { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
