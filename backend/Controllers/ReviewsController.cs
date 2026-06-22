using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Ratings &amp; reviews (API_ENDPOINTS.md §9) — Customer + Driver.</summary>
    [ApiController]
    [Route("api/v1/reviews")]
    [Authorize]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviews;
        private readonly ICurrentUser _me;

        public ReviewsController(IReviewService reviews, ICurrentUser me)
        {
            _reviews = reviews;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");
        private string Role => _me.Role ?? Roles.Guest;

        [HttpPost]
        [Authorize(Roles = $"{Roles.Customer},{Roles.Driver}")]
        public async Task<ActionResult<ReviewDto>> Create([FromBody] ReviewCreateDto dto)
        {
            var review = await _reviews.Create(Uid, Role, dto);
            return StatusCode(StatusCodes.Status201Created, review);
        }

        /// <summary>The signed-in user's own rating summary + received review history.</summary>
        [HttpGet("me")]
        public async Task<ActionResult<ProfileReviewsDto>> Me()
            => Ok(await _reviews.MyReviews(Uid));

        [HttpGet("ride/{rideId:guid}")]
        public async Task<ActionResult<List<ReviewDto>>> ForRide(Guid rideId)
            => Ok(await _reviews.ForRide(Uid, Role, rideId));

        /// <summary>A rental driver rates the rented car or its owner after the agreement ended.</summary>
        [HttpPost("rental/{agreementId:guid}")]
        [Authorize(Roles = Roles.Driver)]
        public async Task<ActionResult<ReviewDto>> CreateRentalReview(Guid agreementId, [FromBody] RentalReviewCreateDto dto)
        {
            var review = await _reviews.CreateRentalReview(Uid, agreementId, dto);
            return StatusCode(StatusCodes.Status201Created, review);
        }

        /// <summary>Reviews left on a rental agreement (its driver/owner, or staff).</summary>
        [HttpGet("rental/{agreementId:guid}")]
        public async Task<ActionResult<List<ReviewDto>>> ForRentalAgreement(Guid agreementId)
            => Ok(await _reviews.ForRentalAgreement(Uid, Role, agreementId));

        [HttpGet("user/{userId:guid}")]
        public async Task<ActionResult<List<ReviewDto>>> ForUser(Guid userId)
            => Ok(await _reviews.ReceivedBy(userId));
    }
}
