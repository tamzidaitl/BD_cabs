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

        [HttpGet("ride/{rideId:guid}")]
        public async Task<ActionResult<List<ReviewDto>>> ForRide(Guid rideId)
            => Ok(await _reviews.ForRide(Uid, Role, rideId));

        [HttpGet("user/{userId:guid}")]
        public async Task<ActionResult<List<ReviewDto>>> ForUser(Guid userId)
            => Ok(await _reviews.ReceivedBy(userId));
    }
}
