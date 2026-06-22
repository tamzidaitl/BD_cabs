using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Rental driver flow (API_ENDPOINTS.md §3 Rental) — Driver only.</summary>
    [ApiController]
    [Route("api/v1/rentals")]
    [Authorize(Roles = Roles.Driver)]
    public class RentalsController : ControllerBase
    {
        private readonly IRentalService _rentals;
        private readonly ICurrentUser _me;

        public RentalsController(IRentalService rentals, ICurrentUser me)
        {
            _rentals = rentals;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        [HttpGet("available-vehicles")]
        public async Task<ActionResult<List<RentalVehicleDto>>> Available() => Ok(await _rentals.AvailableVehicles());

        [HttpPost("requests")]
        public async Task<ActionResult<RentalAgreementDto>> Request([FromBody] RentalRequestDto dto)
        {
            var agreement = await _rentals.RequestRental(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, agreement);
        }

        [HttpGet("me")]
        public async Task<ActionResult<List<RentalAgreementDto>>> Mine() => Ok(await _rentals.Mine(Uid));

        [HttpGet("{id:guid}/rent-due")]
        public async Task<ActionResult<RentDueDto>> RentDue(Guid id) => Ok(await _rentals.RentDue(Uid, id));

        [HttpPost("{id:guid}/pay-rent")]
        public async Task<ActionResult<RentPaymentDto>> PayRent(Guid id, [FromBody] PayRentDto dto)
        {
            var payment = await _rentals.PayRent(Uid, id, dto);
            return StatusCode(StatusCodes.Status201Created, payment);
        }
    }
}
