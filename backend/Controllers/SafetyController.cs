using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Safety: SOS &amp; share-trip (API_ENDPOINTS.md §12) — Customer + Driver.</summary>
    [ApiController]
    [Route("api/v1/safety")]
    [Authorize(Roles = $"{Roles.Customer},{Roles.Driver}")]
    public class SafetyController : ControllerBase
    {
        private readonly ISafetyService _safety;
        private readonly ICurrentUser _me;

        public SafetyController(ISafetyService safety, ICurrentUser me)
        {
            _safety = safety;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        [HttpPost("sos")]
        public async Task<ActionResult<SafetyEventDto>> Sos([FromBody] SosDto? dto)
            => StatusCode(StatusCodes.Status201Created, await _safety.RaiseSos(Uid, dto ?? new SosDto()));

        [HttpPost("share-trip")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<SafetyEventDto>> ShareTrip([FromBody] ShareTripDto dto)
            => StatusCode(StatusCodes.Status201Created, await _safety.ShareTrip(Uid, dto));
    }
}
