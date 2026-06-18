using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Support Admin / operations endpoints (API_ENDPOINTS.md §13a).</summary>
    [ApiController]
    [Route("api/v1/ops")]
    [Authorize(Roles = $"{Roles.SupportAdmin},{Roles.SuperAdmin}")]
    public class OpsController : ControllerBase
    {
        private readonly IOpsService _ops;

        public OpsController(IOpsService ops)
        {
            _ops = ops;
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<Dictionary<string, int>>> Dashboard()
        {
            return Ok(await _ops.Dashboard());
        }

        [HttpGet("rides")]
        public async Task<ActionResult<PagedResult<AdminRideDto>>> Rides(
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            return Ok(await _ops.Rides(status, page, pageSize));
        }

        [HttpGet("drivers/pending")]
        public async Task<ActionResult<PagedResult<UserDto>>> PendingDrivers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            return Ok(await _ops.PendingDrivers(page, pageSize));
        }

        [HttpPatch("drivers/{id:guid}/verification")]
        public async Task<ActionResult<UserDto>> VerifyDriver(Guid id, [FromBody] VerificationDecisionDto dto)
        {
            return Ok(await _ops.VerifyDriver(id, dto));
        }

        [HttpGet("vehicles/pending")]
        public async Task<ActionResult<PagedResult<VehicleVerificationDto>>> PendingVehicles(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            return Ok(await _ops.PendingVehicles(page, pageSize));
        }

        [HttpPatch("vehicles/{id:guid}/verification")]
        public async Task<ActionResult<VehicleDto>> VerifyVehicle(Guid id, [FromBody] VerificationDecisionDto dto)
        {
            return Ok(await _ops.VerifyVehicle(id, dto));
        }
    }
}
