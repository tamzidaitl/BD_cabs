using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Fare breakdown for a ride (API_ENDPOINTS.md §7) — Customer/Driver.</summary>
    [ApiController]
    [Route("api/v1/fares")]
    [Authorize]
    public class FaresController : ControllerBase
    {
        private readonly IRideService _rides;
        private readonly ICurrentUser _me;

        public FaresController(IRideService rides, ICurrentUser me)
        {
            _rides = rides;
            _me = me;
        }

        [HttpGet("breakdown/{rideId:guid}")]
        public async Task<ActionResult<FareBreakdownDto>> Breakdown(Guid rideId)
        {
            var uid = _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");
            return Ok(await _rides.FareBreakdown(uid, _me.Role ?? Roles.Guest, rideId));
        }
    }
}
