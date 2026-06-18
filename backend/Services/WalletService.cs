using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// In-app wallet (API_ENDPOINTS.md §8). Every balance change is journalled as a
    /// <see cref="WalletTransaction"/> so the ledger always reconciles to the
    /// balance. Top-ups/withdrawals here settle immediately — the real gateway and
    /// payout rails are out of this slice.
    /// </summary>
    public class WalletService : IWalletService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public WalletService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<WalletDto> GetMine(Guid userId)
        {
            var wallet = await GetOrCreate(userId);
            await _db.SaveChangesAsync();
            return _mapper.Map<WalletDto>(wallet);
        }

        public async Task<List<WalletTransactionDto>> Transactions(Guid userId)
        {
            var txns = await _db.WalletTransactions.AsNoTracking()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Take(200)
                .ToListAsync();
            return _mapper.Map<List<WalletTransactionDto>>(txns);
        }

        public async Task<WalletDto> Topup(Guid userId, WalletTopupDto dto)
        {
            if (dto.AmountMinor <= 0)
                throw AppException.BadRequest("Top-up amount must be positive.", "INVALID_AMOUNT");

            var wallet = await GetOrCreate(userId);
            Apply(wallet, dto.AmountMinor, WalletTxnType.Topup, $"Top-up via {dto.Method}");
            await _db.SaveChangesAsync();
            return _mapper.Map<WalletDto>(wallet);
        }

        public async Task<WalletDto> Withdraw(Guid userId, WalletWithdrawDto dto)
        {
            if (dto.AmountMinor <= 0)
                throw AppException.BadRequest("Withdrawal amount must be positive.", "INVALID_AMOUNT");

            var wallet = await GetOrCreate(userId);
            if (wallet.BalanceMinor < dto.AmountMinor)
                throw AppException.Unprocessable("INSUFFICIENT_BALANCE", "Wallet balance is insufficient for this withdrawal.");

            Apply(wallet, -dto.AmountMinor, WalletTxnType.Payout, "Payout request");
            await _db.SaveChangesAsync();
            return _mapper.Map<WalletDto>(wallet);
        }

        public async Task Credit(Guid userId, int amountMinor, string type, string? reference)
        {
            if (amountMinor <= 0) return;
            var wallet = await GetOrCreate(userId);
            Apply(wallet, amountMinor, type, reference);
            await _db.SaveChangesAsync();
        }

        public async Task Debit(Guid userId, int amountMinor, string type, string? reference)
        {
            if (amountMinor <= 0) return;
            var wallet = await GetOrCreate(userId);
            if (wallet.BalanceMinor < amountMinor)
                throw AppException.Unprocessable("INSUFFICIENT_BALANCE", "Wallet balance is insufficient.");
            Apply(wallet, -amountMinor, type, reference);
            await _db.SaveChangesAsync();
        }

        // ---- helpers ---------------------------------------------------------

        private async Task<Wallet> GetOrCreate(Guid userId)
        {
            var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet is null)
            {
                var now = DateTime.UtcNow;
                wallet = new Wallet
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Currency = "BDT",
                    BalanceMinor = 0,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                _db.Wallets.Add(wallet);
            }
            return wallet;
        }

        /// <summary>Applies a signed delta to the balance and journals it.</summary>
        private void Apply(Wallet wallet, int deltaMinor, string type, string? reference)
        {
            wallet.BalanceMinor += deltaMinor;
            wallet.UpdatedAt = DateTime.UtcNow;
            _db.WalletTransactions.Add(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = wallet.Id,
                UserId = wallet.UserId,
                Type = type,
                AmountMinor = deltaMinor,
                BalanceAfterMinor = wallet.BalanceMinor,
                Reference = reference,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }
}
