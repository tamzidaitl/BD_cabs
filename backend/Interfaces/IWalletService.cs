using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IWalletService
    {
        Task<WalletDto> GetMine(Guid userId);
        Task<List<WalletTransactionDto>> Transactions(Guid userId);
        Task<WalletDto> Topup(Guid userId, WalletTopupDto dto);
        Task<WalletDto> Withdraw(Guid userId, WalletWithdrawDto dto);

        /// <summary>Credit a wallet (e.g. driver earnings, refund). Creates it if needed.</summary>
        Task Credit(Guid userId, int amountMinor, string type, string? reference);

        /// <summary>Debit a wallet; throws 422 if the balance is insufficient.</summary>
        Task Debit(Guid userId, int amountMinor, string type, string? reference);
    }
}
