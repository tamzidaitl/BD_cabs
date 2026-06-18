using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class WalletDto
    {
        public Guid Id { get; set; }
        public string Currency { get; set; } = "BDT";
        public int BalanceMinor { get; set; }
    }

    public class WalletTransactionDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public int AmountMinor { get; set; }
        public int BalanceAfterMinor { get; set; }
        public string? Reference { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class WalletTopupDto
    {
        [Range(1, int.MaxValue)] public int AmountMinor { get; set; }
        public string Method { get; set; } = "Card";
    }

    /// <summary>Body for POST /wallet/withdraw — a driver payout request.</summary>
    public class WalletWithdrawDto
    {
        [Range(1, int.MaxValue)] public int AmountMinor { get; set; }
    }
}
