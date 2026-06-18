using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IReviewService
    {
        Task<ReviewDto> Create(Guid reviewerId, string role, ReviewCreateDto dto);
        Task<List<ReviewDto>> ForRide(Guid userId, string role, Guid rideId);
        Task<List<ReviewDto>> ReceivedBy(Guid userId);
        Task<RatingSummaryDto> DriverRating(Guid driverUserId);
    }
}
