using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Finance Admin endpoints (API_ENDPOINTS.md §13b).</summary>
    [ApiController]
    [Route("api/v1/finance")]
    [Authorize(Roles = $"{Roles.FinanceAdmin},{Roles.SuperAdmin}")]
    public class FinanceController : ControllerBase
    {
        private readonly IFinanceService _finance;

        public FinanceController(IFinanceService finance)
        {
            _finance = finance;
        }

        [HttpPost("payouts/run")]
        public async Task<IActionResult> RunPayouts()
        {
            return Ok(await _finance.RunPayouts());
        }

        [HttpGet("reports")]
        public async Task<IActionResult> Reports([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            return Ok(await _finance.Reports(from, to));
        }
    }
}
