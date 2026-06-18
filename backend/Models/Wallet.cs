using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A user's in-app wallet (API_ENDPOINTS.md §8). Customers top up and pay from
    /// it; drivers receive payouts into it. Balance is minor units; every change is
    /// recorded as a <see cref="WalletTransaction"/> for an auditable ledger.
    /// </summary>
    public class Wallet
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }

        [MaxLength(8)] public string Currency { get; set; } = "BDT";
        public int BalanceMinor { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>One movement in a wallet ledger. Amount is signed (credit +, debit −).</summary>
    public class WalletTransaction
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Guid UserId { get; set; }

        /// <summary>One of <see cref="WalletTxnType"/>.</summary>
        [MaxLength(20)] public string Type { get; set; } = WalletTxnType.Topup;

        /// <summary>Signed minor-unit amount (positive = credit, negative = debit).</summary>
        public int AmountMinor { get; set; }
        public int BalanceAfterMinor { get; set; }

        [MaxLength(120)] public string? Reference { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
