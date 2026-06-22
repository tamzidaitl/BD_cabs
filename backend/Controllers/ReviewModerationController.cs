using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>
    /// Review moderation (API_ENDPOINTS.md §9 / role_wise_story.md §6). Staff can
    /// monitor every review and hide, unhide, or remove inappropriate ones; hidden
    /// and removed reviews drop out of public listings and rating averages. Gated by
    /// the same roles that hold the <c>reviews:moderate</c> permission.
    /// </summary>
    [ApiController]
    [Route("api/v1/ops/reviews")]
    [Authorize(Roles = $"{Roles.SupportAdmin},{Roles.SuperAdmin}")]
    public class ReviewModerationController : ControllerBase
    {
        private readonly IReviewService _reviews;
        private readonly ICurrentUser _me;

        public ReviewModerationController(IReviewService reviews, ICurrentUser me)
        {
            _reviews = reviews;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        /// <summary>List reviews for moderation, optionally filtered by status / reviewee type.</summary>
        [HttpGet]
        public async Task<ActionResult<PagedResult<AdminReviewDto>>> List(
            [FromQuery] string? status = null,
            [FromQuery] string? revieweeType = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
            => Ok(await _reviews.ListForModeration(status, revieweeType, page, pageSize));

        /// <summary>Hide, unhide, or remove a review.</summary>
        [HttpPatch("{id:guid}")]
        public async Task<ActionResult<AdminReviewDto>> Moderate(Guid id, [FromBody] ReviewModerationDto dto)
            => Ok(await _reviews.Moderate(Uid, id, dto));
    }
}
