using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Saved places &amp; favourites (API_ENDPOINTS.md §10) — Customer.</summary>
    [ApiController]
    [Route("api/v1/places")]
    [Authorize(Roles = Roles.Customer)]
    public class PlacesController : ControllerBase
    {
        private readonly IPlaceService _places;
        private readonly ICurrentUser _me;

        public PlacesController(IPlaceService places, ICurrentUser me)
        {
            _places = places;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        [HttpGet("me")]
        public async Task<ActionResult<List<SavedPlaceDto>>> Mine() => Ok(await _places.List(Uid));

        [HttpGet("recent")]
        public async Task<ActionResult<List<RecentPlaceDto>>> Recent() => Ok(await _places.Recent(Uid));

        [HttpPost]
        public async Task<ActionResult<SavedPlaceDto>> Create([FromBody] SavedPlaceCreateDto dto)
        {
            var place = await _places.Create(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, place);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<SavedPlaceDto>> Update(Guid id, [FromBody] SavedPlaceCreateDto dto)
            => Ok(await _places.Update(Uid, id, dto));

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _places.Delete(Uid, id);
            return NoContent();
        }
    }
}
