using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Ride / trip lifecycle (API_ENDPOINTS.md §5) — Customer + Driver.</summary>
    [ApiController]
    [Route("api/v1/rides")]
    [Authorize]
    public class RidesController : ControllerBase
    {
        private readonly IRideService _rides;
        private readonly IRoutingService _routing;
        private readonly ICurrentUser _me;

        public RidesController(IRideService rides, IRoutingService routing, ICurrentUser me)
        {
            _rides = rides;
            _routing = routing;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");
        private string Role => _me.Role ?? Roles.Guest;

        // ---- Customer ----

        [HttpPost("estimate")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<FareEstimateResultDto>> Estimate([FromBody] RideEstimateDto dto)
            => Ok(await _rides.Estimate(dto));

        [HttpGet("nearby-vehicles")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<List<NearbyVehicleDto>>> NearbyVehicles(
            [FromQuery] double lat, [FromQuery] double lng, [FromQuery] string? vehicleType = null)
            => Ok(await _rides.NearbyVehicles(lat, lng, vehicleType));

        [HttpPost("request")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<RideCreatedDto>> Request([FromBody] RideRequestDto dto)
        {
            var created = await _rides.Request(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, created);
        }

        [HttpGet("me")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<PagedResult<RideDto>>> MyRides(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
            => Ok(await _rides.MyRides(Uid, page, pageSize));

        // ---- Recurring (Customer) ----

        [HttpPost("recurring")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<RecurringRideDto>> CreateRecurring([FromBody] RecurringRideCreateDto dto)
        {
            var created = await _rides.CreateRecurring(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, created);
        }

        [HttpGet("recurring")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<ActionResult<List<RecurringRideDto>>> ListRecurring()
            => Ok(await _rides.ListRecurring(Uid));

        [HttpDelete("recurring/{id:guid}")]
        [Authorize(Roles = Roles.Customer)]
        public async Task<IActionResult> CancelRecurring(Guid id)
        {
            await _rides.CancelRecurring(Uid, id);
            return NoContent();
        }

        // ---- Driver: discovery & lifecycle ----

        [HttpGet("nearby-requests")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<List<RideDto>>> NearbyRequests()
            => Ok(await _rides.NearbyRequests(Uid));

        [HttpPost("{id:guid}/accept")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<RideDto>> Accept(Guid id) => Ok(await _rides.Accept(Uid, id));

        [HttpPost("{id:guid}/reject")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<RideDto>> Reject(Guid id) => Ok(await _rides.Reject(Uid, id));

        [HttpPost("{id:guid}/arrived")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<RideDto>> Arrived(Guid id) => Ok(await _rides.Arrived(Uid, id));

        [HttpPost("{id:guid}/start")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<RideDto>> Start(Guid id, [FromBody] StartRideDto dto)
            => Ok(await _rides.Start(Uid, id, dto.Otp));

        [HttpPost("{id:guid}/complete")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<RideDto>> Complete(Guid id) => Ok(await _rides.Complete(Uid, id));

        // ---- Shared (Customer + Driver + Ops) ----

        /// <summary>
        /// Driving route (road-following geometry + distance/time) between two points,
        /// proxied to the routing provider so the client never calls it directly.
        /// Returns 204 when no route is available; the map then draws a straight line.
        /// </summary>
        [HttpGet("route")]
        public async Task<ActionResult<RoutePathDto>> Route(
            [FromQuery] double fromLat, [FromQuery] double fromLng,
            [FromQuery] double toLat, [FromQuery] double toLng)
        {
            var path = await _routing.RoutePath(fromLat, fromLng, toLat, toLng);
            return path is null ? NoContent() : Ok(path);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<RideDto>> Get(Guid id) => Ok(await _rides.Get(Uid, Role, id));

        [HttpGet("{id:guid}/track")]
        public async Task<ActionResult<RideTrackDto>> Track(Guid id) => Ok(await _rides.Track(Uid, Role, id));

        [HttpPost("{id:guid}/cancel")]
        public async Task<ActionResult<RideDto>> Cancel(Guid id, [FromBody] CancelRideDto? dto)
            => Ok(await _rides.Cancel(Uid, Role, id, dto?.Reason));
    }
}
