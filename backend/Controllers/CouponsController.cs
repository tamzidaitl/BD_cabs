using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>
    /// Coupons (API_ENDPOINTS.md §7). SuperAdmin manages the catalogue; customers
    /// list available coupons and validate/apply a code at booking/payment.
    /// </summary>
    [ApiController]
    [Route("api/v1/coupons")]
    public class CouponsController : ControllerBase
    {
        private readonly ICouponService _coupons;
        private readonly ICurrentUser _me;

        public CouponsController(ICouponService coupons, ICurrentUser me)
        {
            _coupons = coupons;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        // GET /api/v1/coupons  → coupons available to the current customer/corporate.
        [HttpGet]
        [Authorize(Roles = $"{Roles.Customer},{Roles.Corporate}")]
        public async Task<ActionResult<List<CouponDto>>> ListAvailable()
            => Ok(await _coupons.ListAvailable(Uid, _me.Role ?? Roles.Customer));

        // POST /api/v1/coupons/apply  → validate a code against a prospective fare.
        [HttpPost("apply")]
        [Authorize(Roles = $"{Roles.Customer},{Roles.Corporate}")]
        public async Task<ActionResult<ApplyCouponResultDto>> Apply([FromBody] ApplyCouponDto dto)
            => Ok(await _coupons.Apply(Uid, dto));

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
