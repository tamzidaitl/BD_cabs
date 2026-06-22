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
        public string? RentalPeriod { get; set; }
        public string? RentalTerms { get; set; }
        /// <summary>True when an active/approved rental agreement has the car in a
        /// driver's hands — the owner can't change its status until the rental ends.</summary>
        public bool IsRentedOut { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// A rentable vehicle as shown to a driver browsing the marketplace
    /// (GET /rentals/available-vehicles), enriched with the offering Fleet Owner
    /// and the vehicle's verified documents so the driver can judge it before
    /// requesting. Mirrors <c>VehicleVerificationDto</c> on the Ops side.
    /// </summary>
    public class RentalVehicleDto
    {
        public VehicleDto Vehicle { get; set; } = new();
        public RentalOwnerDto? Owner { get; set; }
        /// <summary>Uploaded documents (registration, insurance, fitness) with their
        /// verification status, so the driver sees the car's paperwork before requesting.</summary>
        public List<VehicleDocumentDto> Documents { get; set; } = new();
    }

    /// <summary>The Fleet Owner offering a vehicle for rent, with their aggregate rating.</summary>
    public class RentalOwnerDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? CompanyName { get; set; }
        public string? AvatarUrl { get; set; }
        /// <summary>Aggregate rating from rider/driver reviews; null until first rated.</summary>
        public double? Rating { get; set; }
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
        /// <summary>The driver who requested/rents the car (name, phone, avatar, rating).</summary>
        public RentalDriverDto? Driver { get; set; }
        /// <summary>The rented car (photo, plate, and the owner's listed price/period),
        /// so both the owner's request list and the driver's agreements show what car
        /// the agreement is for and its asking price.</summary>
        public RentalVehicleSummaryDto? Vehicle { get; set; }
    }

    /// <summary>Lightweight vehicle summary attached to a rental agreement: enough to
    /// show the car (photo, make/model/plate) and the Fleet Owner's listed rent.</summary>
    public class RentalVehicleSummaryDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string? Make { get; set; }
        public string? Model { get; set; }
        public string? PhotoUrl { get; set; }
        /// <summary>The owner's listed rent for this car (minor units), independent of
        /// the per-agreement negotiated terms.</summary>
        public int? RentalPriceMinor { get; set; }
        public string? RentalPeriod { get; set; }
    }

    /// <summary>Lightweight driver summary shown to the owner on a rental request.</summary>
    public class RentalDriverDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public double? Rating { get; set; }
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
