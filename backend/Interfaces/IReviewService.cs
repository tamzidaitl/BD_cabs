using BdCabs.Api.Common;
using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IReviewService
    {
        Task<ReviewDto> Create(Guid reviewerId, string role, ReviewCreateDto dto);
        Task<List<ReviewDto>> ForRide(Guid userId, string role, Guid rideId);

        /// <summary>A rental driver rates the rented car / its owner once the agreement ended.</summary>
        Task<ReviewDto> CreateRentalReview(Guid reviewerId, Guid agreementId, RentalReviewCreateDto dto);
        /// <summary>Reviews left on a rental agreement (visible to its driver/owner).</summary>
        Task<List<ReviewDto>> ForRentalAgreement(Guid userId, string role, Guid agreementId);

        Task<List<ReviewDto>> ReceivedBy(Guid userId);
        Task<RatingSummaryDto> DriverRating(Guid driverUserId);

        /// <summary>The signed-in user's own rating summary + received review history.</summary>
        Task<ProfileReviewsDto> MyReviews(Guid userId);

        // ---- Moderation (Super Admin / Support Admin) ----
        Task<PagedResult<AdminReviewDto>> ListForModeration(string? status, string? revieweeType, int page, int pageSize);
        Task<AdminReviewDto> Moderate(Guid moderatorId, Guid reviewId, ReviewModerationDto dto);
    }
}
