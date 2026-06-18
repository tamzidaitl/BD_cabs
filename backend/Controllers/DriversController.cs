using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Driver self-service (API_ENDPOINTS.md §3) + public driver rating.</summary>
    [ApiController]
    [Route("api/v1/drivers")]
    public class DriversController : ControllerBase
    {
        private readonly IDriverService _drivers;
        private readonly IRideService _rides;
        private readonly IReviewService _reviews;
        private readonly ICurrentUser _me;

        public DriversController(IDriverService drivers, IRideService rides, IReviewService reviews, ICurrentUser me)
        {
            _drivers = drivers;
            _rides = rides;
            _reviews = reviews;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        [HttpPost("onboarding")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverProfileDto>> Onboard([FromBody] DriverOnboardingDto dto)
            => Ok(await _drivers.Onboard(Uid, dto));

        [HttpGet("me")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverProfileDto>> Me() => Ok(await _drivers.GetMine(Uid));

        [HttpPut("me")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverProfileDto>> Update([FromBody] DriverUpdateDto dto)
            => Ok(await _drivers.Update(Uid, dto));

        [HttpPost("me/documents")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverDocumentDto>> AddDocument([FromBody] DriverDocumentCreateDto dto)
        {
            var doc = await _drivers.AddDocument(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, doc);
        }

        [HttpGet("me/documents")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<List<DriverDocumentDto>>> Documents() => Ok(await _drivers.ListDocuments(Uid));

        [HttpPatch("me/availability")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverProfileDto>> Availability([FromBody] AvailabilityDto dto)
            => Ok(await _drivers.SetAvailability(Uid, dto));

        [HttpPatch("me/location")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverProfileDto>> Location([FromBody] DriverLocationDto dto)
            => Ok(await _drivers.UpdateLocation(Uid, dto));

        [HttpGet("me/earnings")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<DriverEarningsDto>> Earnings() => Ok(await _drivers.Earnings(Uid));

        [HttpGet("me/trips")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<PagedResult<RideDto>>> Trips(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
            => Ok(await _rides.DriverTrips(Uid, page, pageSize));

        // Public: a driver's aggregate rating (API_ENDPOINTS.md §9).
        [HttpGet("{id:guid}/rating")]
        [AllowAnonymous]
        public async Task<ActionResult<RatingSummaryDto>> Rating(Guid id) => Ok(await _reviews.DriverRating(id));
    }
}
