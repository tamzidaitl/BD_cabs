using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Corporate Client console (role_wise_story.md §4) — Corporate only.</summary>
    [ApiController]
    [Route("api/v1/corporate")]
    [Authorize(Roles = Roles.Corporate)]
    public class CorporateController : ControllerBase
    {
        private readonly ICorporateService _corporate;
        private readonly ICurrentUser _me;

        public CorporateController(ICorporateService corporate, ICurrentUser me)
        {
            _corporate = corporate;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        // ---- Company profile / KYC / billing ----
        [HttpPost("onboarding")]
        public async Task<ActionResult<CorporateProfileDto>> Onboard([FromBody] CorporateOnboardingDto dto)
            => Ok(await _corporate.Onboard(Uid, dto));

        [HttpGet("me")]
        public async Task<ActionResult<CorporateProfileDto>> Me() => Ok(await _corporate.GetProfile(Uid));

        // ---- Employees ----
        [HttpGet("employees")]
        public async Task<ActionResult<List<CorporateEmployeeDto>>> Employees() => Ok(await _corporate.Employees(Uid));

        [HttpPost("employees")]
        public async Task<ActionResult<CorporateEmployeeDto>> AddEmployee([FromBody] CorporateEmployeeInputDto dto)
            => StatusCode(StatusCodes.Status201Created, await _corporate.AddEmployee(Uid, dto));

        [HttpPut("employees/{id:guid}")]
        public async Task<ActionResult<CorporateEmployeeDto>> UpdateEmployee(Guid id, [FromBody] CorporateEmployeeInputDto dto)
            => Ok(await _corporate.UpdateEmployee(Uid, id, dto));

        [HttpDelete("employees/{id:guid}")]
        public async Task<IActionResult> RemoveEmployee(Guid id)
        {
            await _corporate.RemoveEmployee(Uid, id);
            return NoContent();
        }

        // ---- Bookings ----
        [HttpGet("bookings")]
        public async Task<ActionResult<List<CorporateBookingDto>>> Bookings([FromQuery] string? status)
            => Ok(await _corporate.Bookings(Uid, status));

        [HttpPost("bookings/estimate")]
        public async Task<ActionResult<CorporateBookingEstimateResultDto>> Estimate([FromBody] CorporateBookingEstimateDto dto)
            => Ok(await _corporate.EstimateBooking(Uid, dto));

        [HttpPost("bookings")]
        public async Task<ActionResult<CorporateBookingDto>> CreateBooking([FromBody] CorporateBookingInputDto dto)
            => StatusCode(StatusCodes.Status201Created, await _corporate.CreateBooking(Uid, dto));

        [HttpPost("bookings/{id:guid}/approve")]
        public async Task<ActionResult<CorporateBookingDto>> ApproveBooking(Guid id)
            => Ok(await _corporate.ApproveBooking(Uid, id));

        [HttpPost("bookings/{id:guid}/reject")]
        public async Task<ActionResult<CorporateBookingDto>> RejectBooking(Guid id, [FromBody] RejectBookingDto dto)
            => Ok(await _corporate.RejectBooking(Uid, id, dto));

        [HttpPost("bookings/{id:guid}/complete")]
        public async Task<ActionResult<CorporateBookingDto>> CompleteBooking(Guid id)
            => Ok(await _corporate.CompleteBooking(Uid, id));

        [HttpPost("bookings/{id:guid}/cancel")]
        public async Task<ActionResult<CorporateBookingDto>> CancelBooking(Guid id)
            => Ok(await _corporate.CancelBooking(Uid, id));

        // ---- Recurring rides ----
        [HttpGet("recurring")]
        public async Task<ActionResult<List<CorporateRecurringRideDto>>> Recurring()
            => Ok(await _corporate.RecurringRides(Uid));

        [HttpPost("recurring")]
        public async Task<ActionResult<CorporateRecurringRideDto>> CreateRecurring([FromBody] CorporateRecurringRideInputDto dto)
            => StatusCode(StatusCodes.Status201Created, await _corporate.CreateRecurring(Uid, dto));

        [HttpDelete("recurring/{id:guid}")]
        public async Task<IActionResult> CancelRecurring(Guid id)
        {
            await _corporate.CancelRecurring(Uid, id);
            return NoContent();
        }

        // ---- Billing & reporting ----
        [HttpGet("billing")]
        public async Task<ActionResult<CorporateBillingDto>> Billing() => Ok(await _corporate.Billing(Uid));

        [HttpGet("reports")]
        public async Task<ActionResult<CorporateReportDto>> Reports([FromQuery] DateTime? from, [FromQuery] DateTime? to)
            => Ok(await _corporate.Reports(Uid, from, to));

        // ---- Vehicle rental contracts (Corporate ↔ Vehicle Owner) ----
        [HttpGet("rental-vehicles")]
        public async Task<ActionResult<List<CorporateRentalVehicleDto>>> RentalVehicles()
            => Ok(await _corporate.RentalVehicles());

        [HttpGet("rental-contracts")]
        public async Task<ActionResult<List<CorporateRentalContractDto>>> RentalContracts()
            => Ok(await _corporate.RentalContracts(Uid));

        [HttpPost("rental-contracts")]
        public async Task<ActionResult<CorporateRentalContractDto>> RequestRental([FromBody] CorporateRentalRequestDto dto)
            => StatusCode(StatusCodes.Status201Created, await _corporate.RequestRentalContract(Uid, dto));

        [HttpPost("rental-contracts/{id:guid}/cancel")]
        public async Task<ActionResult<CorporateRentalContractDto>> CancelRental(Guid id)
            => Ok(await _corporate.CancelRentalContract(Uid, id));

        // ---- Reviews of Fleet/Vehicle owners ----
        [HttpGet("fleets")]
        public async Task<ActionResult<List<CorporateFleetSummaryDto>>> Fleets() => Ok(await _corporate.Fleets(Uid));

        [HttpGet("reviews")]
        public async Task<ActionResult<List<ReviewDto>>> Reviews() => Ok(await _corporate.Reviews(Uid));

        [HttpGet("reviews-received")]
        public async Task<ActionResult<List<ReviewDto>>> ReviewsReceived() => Ok(await _corporate.ReviewsReceived(Uid));

        [HttpPost("reviews")]
        public async Task<ActionResult<ReviewDto>> CreateReview([FromBody] CorporateReviewInputDto dto)
            => StatusCode(StatusCodes.Status201Created, await _corporate.CreateReview(Uid, dto));
    }
}
