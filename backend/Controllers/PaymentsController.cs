using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Payment methods &amp; ride charges (API_ENDPOINTS.md §8) — Customer.</summary>
    [ApiController]
    [Route("api/v1/payments")]
    [Authorize(Roles = Roles.Customer)]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _payments;
        private readonly ICurrentUser _me;

        public PaymentsController(IPaymentService payments, ICurrentUser me)
        {
            _payments = payments;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        [HttpGet("methods")]
        public async Task<ActionResult<List<PaymentMethodDto>>> Methods() => Ok(await _payments.ListMethods(Uid));

        [HttpPost("methods")]
        public async Task<ActionResult<PaymentMethodDto>> AddMethod([FromBody] PaymentMethodCreateDto dto)
        {
            var method = await _payments.AddMethod(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, method);
        }

        [HttpDelete("methods/{id:guid}")]
        public async Task<IActionResult> DeleteMethod(Guid id)
        {
            await _payments.DeleteMethod(Uid, id);
            return NoContent();
        }

        [HttpPost("{rideId:guid}/charge")]
        public async Task<ActionResult<PaymentDto>> Charge(Guid rideId, [FromBody] ChargeRideDto? dto)
            => Ok(await _payments.ChargeRide(Uid, rideId, dto ?? new ChargeRideDto()));

        [HttpGet("me")]
        public async Task<ActionResult<List<PaymentDto>>> History() => Ok(await _payments.History(Uid));
    }
}
