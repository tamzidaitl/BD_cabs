using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>
    /// Coupon administration (API_ENDPOINTS.md §7). The admin frontend uses the
    /// SuperAdmin sub-set: list all, create, change status.
    /// </summary>
    [ApiController]
    [Route("api/v1/coupons")]
    public class CouponsController : ControllerBase
    {
        private readonly ICouponService _coupons;

        public CouponsController(ICouponService coupons)
        {
            _coupons = coupons;
        }

        // GET /api/v1/coupons/admin  → endpoints.ts coupons.listAdmin()
        [HttpGet("admin")]
        [Authorize(Roles = Roles.SuperAdmin)]
        public async Task<ActionResult<List<CouponDto>>> ListAdmin()
        {
            return Ok(await _coupons.ListAll());
        }

        // POST /api/v1/coupons  → endpoints.ts coupons.create()
        [HttpPost]
        [Authorize(Roles = Roles.SuperAdmin)]
        public async Task<ActionResult<CouponDto>> Create([FromBody] CouponCreateDto dto)
        {
            var coupon = await _coupons.Create(dto);
            return StatusCode(StatusCodes.Status201Created, coupon);
        }

        // PATCH /api/v1/coupons/{id}/status  → endpoints.ts coupons.setStatus()
        [HttpPatch("{id:guid}/status")]
        [Authorize(Roles = Roles.SuperAdmin)]
        public async Task<ActionResult<CouponDto>> SetStatus(Guid id, [FromBody] CouponStatusDto dto)
        {
            return Ok(await _coupons.SetStatus(id, dto.Status));
        }
    }
}
