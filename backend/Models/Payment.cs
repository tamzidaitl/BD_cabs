using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A saved payment instrument for a customer (API_ENDPOINTS.md §8). No raw card
    /// data is stored — only a provider token reference plus display metadata.
    /// </summary>
    public class PaymentMethod
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }

        /// <summary>One of <see cref="PaymentMethodType"/>.</summary>
        [MaxLength(20)] public string Type { get; set; } = PaymentMethodType.Card;

        [MaxLength(60)] public string? Label { get; set; }
        [MaxLength(4)] public string? Last4 { get; set; }
        /// <summary>Opaque token from the payment gateway (never the PAN).</summary>
        [MaxLength(256)] public string? ProviderToken { get; set; }
        public bool IsDefault { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// A charge against a completed ride (API_ENDPOINTS.md §8). The real gateway
    /// integration is out of this slice; charges settle immediately as Paid (or to
    /// the wallet) so the downstream fare-split/earnings flow can run.
    /// </summary>
    public class Payment
    {
        public Guid Id { get; set; }
        public Guid RideId { get; set; }
        public Guid CustomerId { get; set; }

        [MaxLength(8)] public string Currency { get; set; } = "BDT";
        public int AmountMinor { get; set; }

        /// <summary>One of <see cref="PaymentMethodType"/>.</summary>
        [MaxLength(20)] public string Method { get; set; } = PaymentMethodType.Cash;

        /// <summary>One of <see cref="PaymentStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = PaymentStatus.Pending;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
