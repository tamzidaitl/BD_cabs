using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class PaymentMethodDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Label { get; set; }
        public string? Last4 { get; set; }
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PaymentMethodCreateDto
    {
        /// <summary>One of PaymentMethodType (Card, bKash, Nagad, Wallet, Cash).</summary>
        [Required] public string Type { get; set; } = string.Empty;
        [MaxLength(60)] public string? Label { get; set; }
        [MaxLength(4)] public string? Last4 { get; set; }
        /// <summary>Gateway token from the client SDK (never raw card data).</summary>
        [MaxLength(256)] public string? ProviderToken { get; set; }
        public bool IsDefault { get; set; }
    }

    public class PaymentDto
    {
        public Guid Id { get; set; }
        public Guid RideId { get; set; }
        public string Currency { get; set; } = "BDT";
        public int AmountMinor { get; set; }
        public string Method { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Body for POST /payments/{rideId}/charge. Method optional —
    /// defaults to the method recorded on the ride.</summary>
    public class ChargeRideDto
    {
        public string? Method { get; set; }
        public Guid? PaymentMethodId { get; set; }
    }
}
