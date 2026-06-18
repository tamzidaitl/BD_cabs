using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Wallet balance, top-ups, ledger, and driver payouts (API_ENDPOINTS.md §8).</summary>
    [ApiController]
    [Route("api/v1/wallet")]
    [Authorize]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _wallet;
        private readonly ICurrentUser _me;

        public WalletController(IWalletService wallet, ICurrentUser me)
        {
            _wallet = wallet;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        [HttpGet("me")]
        public async Task<ActionResult<WalletDto>> Mine() => Ok(await _wallet.GetMine(Uid));

        [HttpGet("transactions")]
        public async Task<ActionResult<List<WalletTransactionDto>>> Transactions()
            => Ok(await _wallet.Transactions(Uid));

        [HttpPost("topup")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<WalletDto>> Topup([FromBody] WalletTopupDto dto)
            => Ok(await _wallet.Topup(Uid, dto));

        [HttpPost("withdraw")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<WalletDto>> Withdraw([FromBody] WalletWithdrawDto dto)
            => Ok(await _wallet.Withdraw(Uid, dto));
    }
}
