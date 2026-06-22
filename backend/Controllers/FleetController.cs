using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Fleet/Vehicle Owner console (API_ENDPOINTS.md §4b) — FleetOwner only.</summary>
    [ApiController]
    [Route("api/v1/fleet")]
    [Authorize(Roles = Roles.FleetOwner)]
    public class FleetController : ControllerBase
    {
        private readonly IFleetService _fleet;
        private readonly ICurrentUser _me;

        public FleetController(IFleetService fleet, ICurrentUser me)
        {
            _fleet = fleet;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        // ---- Owner profile / KYC ----
        [HttpPost("onboarding")]
        public async Task<ActionResult<FleetProfileDto>> Onboard([FromBody] FleetOnboardingDto dto)
            => Ok(await _fleet.Onboard(Uid, dto));

        [HttpGet("me")]
        public async Task<ActionResult<FleetProfileDto>> Me() => Ok(await _fleet.GetProfile(Uid));

        // ---- Vehicles ----
        [HttpGet("vehicles")]
        public async Task<ActionResult<List<VehicleDto>>> Vehicles() => Ok(await _fleet.Vehicles(Uid));

        // ---- Driver roster ----
        [HttpGet("drivers")]
        public async Task<ActionResult<List<FleetDriverDto>>> Drivers() => Ok(await _fleet.Drivers(Uid));

        [HttpPost("drivers/invite")]
        public async Task<ActionResult<FleetDriverDto>> InviteDriver([FromBody] FleetDriverInviteDto dto)
            => StatusCode(StatusCodes.Status201Created, await _fleet.InviteDriver(Uid, dto));

        [HttpDelete("drivers/{id:guid}")]
        public async Task<IActionResult> RemoveDriver(Guid id)
        {
            await _fleet.RemoveDriver(Uid, id);
            return NoContent();
        }

        // ---- Rental requests / terms ----
        [HttpGet("rental-requests")]
        public async Task<ActionResult<List<RentalAgreementDto>>> RentalRequests()
            => Ok(await _fleet.RentalRequests(Uid));

        [HttpPost("rental-requests/{id:guid}/approve")]
        public async Task<ActionResult<RentalAgreementDto>> Approve(Guid id, [FromBody] ApproveRentalDto dto)
            => Ok(await _fleet.ApproveRental(Uid, id, dto));

        [HttpPost("rental-requests/{id:guid}/reject")]
        public async Task<ActionResult<RentalAgreementDto>> Reject(Guid id, [FromBody] RejectRentalDto dto)
            => Ok(await _fleet.RejectRental(Uid, id, dto));

        [HttpPatch("rentals/{id:guid}/terms")]
        public async Task<ActionResult<RentalAgreementDto>> UpdateTerms(Guid id, [FromBody] UpdateRentalTermsDto dto)
            => Ok(await _fleet.UpdateTerms(Uid, id, dto));

        [HttpGet("rentals/{id:guid}/rent-received")]
        public async Task<ActionResult<RentReceivedDto>> RentReceived(Guid id)
            => Ok(await _fleet.RentReceived(Uid, id));

        // ---- Reporting ----
        [HttpGet("performance")]
        public async Task<ActionResult<List<VehiclePerformanceDto>>> Performance()
            => Ok(await _fleet.Performance(Uid));

        [HttpGet("revenue")]
        public async Task<ActionResult<RevenueReportDto>> Revenue([FromQuery] DateTime? from, [FromQuery] DateTime? to)
            => Ok(await _fleet.Revenue(Uid, from, to));

        [HttpGet("settlements")]
        public async Task<ActionResult<List<SettlementDto>>> Settlements()
            => Ok(await _fleet.Settlements(Uid));

        // ---- Corporate rental contracts (Corporate ↔ Vehicle Owner) ----
        [HttpGet("corporate-rentals")]
        public async Task<ActionResult<List<CorporateRentalContractDto>>> CorporateRentals()
            => Ok(await _fleet.CorporateRentalRequests(Uid));

        [HttpPost("corporate-rentals/{id:guid}/approve")]
        public async Task<ActionResult<CorporateRentalContractDto>> ApproveCorporateRental(Guid id, [FromBody] ApproveCorporateRentalDto dto)
            => Ok(await _fleet.ApproveCorporateRental(Uid, id, dto));

        [HttpPost("corporate-rentals/{id:guid}/reject")]
        public async Task<ActionResult<CorporateRentalContractDto>> RejectCorporateRental(Guid id, [FromBody] RejectRentalDto dto)
            => Ok(await _fleet.RejectCorporateRental(Uid, id, dto));

        [HttpPost("corporate-rentals/{id:guid}/activate")]
        public async Task<ActionResult<CorporateRentalContractDto>> ActivateCorporateRental(Guid id)
            => Ok(await _fleet.ActivateCorporateRental(Uid, id));

        [HttpPost("corporate-rentals/{id:guid}/complete")]
        public async Task<ActionResult<CorporateRentalContractDto>> CompleteCorporateRental(Guid id)
            => Ok(await _fleet.CompleteCorporateRental(Uid, id));

        [HttpPost("corporate-rentals/{id:guid}/assign-driver")]
        public async Task<ActionResult<CorporateRentalContractDto>> AssignDriver(Guid id, [FromBody] AssignRentalDriverDto dto)
            => Ok(await _fleet.AssignDriver(Uid, id, dto));

        [HttpDelete("corporate-rentals/{id:guid}/drivers/{driverId:guid}")]
        public async Task<ActionResult<CorporateRentalContractDto>> UnassignDriver(Guid id, Guid driverId)
            => Ok(await _fleet.UnassignDriver(Uid, id, driverId));

        // ---- Reviews ----
        [HttpGet("reviews")]
        public async Task<ActionResult<List<ReviewDto>>> Reviews()
            => Ok(await _fleet.ReviewsReceived(Uid));

        [HttpPost("driver-reviews")]
        public async Task<ActionResult<ReviewDto>> ReviewDriver([FromBody] FleetDriverReviewInputDto dto)
            => StatusCode(StatusCodes.Status201Created, await _fleet.ReviewDriver(Uid, dto));

        [HttpPost("corporate-reviews")]
        public async Task<ActionResult<ReviewDto>> ReviewCorporate([FromBody] FleetCorporateReviewInputDto dto)
            => StatusCode(StatusCodes.Status201Created, await _fleet.CreateCorporateReview(Uid, dto));
    }
}
