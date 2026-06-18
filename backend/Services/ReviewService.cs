using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Ratings &amp; reviews tied to completed rides (API_ENDPOINTS.md §9). Supports
    /// rider→driver, driver→rider, and (for rental drivers) driver→owner. Each
    /// (ride, reviewer, target) is unique. Driver aggregate ratings are recomputed
    /// on every new driver review.
    /// </summary>
    public class ReviewService : IReviewService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public ReviewService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<ReviewDto> Create(Guid reviewerId, string role, ReviewCreateDto dto)
        {
            var ride = await _db.Rides.FirstOrDefaultAsync(r => r.Id == dto.RideId)
                ?? throw AppException.NotFound("Ride not found.");

            if (ride.Status != RideStatus.Completed)
                throw AppException.Unprocessable("RIDE_NOT_COMPLETED", "You can only review a completed ride.");

            bool isCustomer = ride.CustomerId == reviewerId;
            bool isDriver = ride.DriverId == reviewerId;
            if (!isCustomer && !isDriver)
                throw AppException.Forbidden("You did not take part in this ride.");

            // Resolve the target of the review.
            var (revieweeType, revieweeId) = await ResolveReviewee(ride, isCustomer, dto.RevieweeType);

            bool dup = await _db.Reviews.AnyAsync(r =>
                r.RideId == ride.Id && r.ReviewerId == reviewerId && r.RevieweeType == revieweeType);
            if (dup)
                throw AppException.Conflict("You have already submitted this review.", "REVIEW_EXISTS");

            var now = DateTime.UtcNow;
            var review = new Review
            {
                Id = Guid.NewGuid(),
                RideId = ride.Id,
                ReviewerId = reviewerId,
                RevieweeId = revieweeId,
                RevieweeType = revieweeType,
                Rating = dto.Rating,
                Comment = dto.Comment,
                Tags = dto.Tags ?? new List<string>(),
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.Reviews.Add(review);
            await _db.SaveChangesAsync();

            if (revieweeType == ReviewTargetType.Driver)
                await RecomputeDriverRating(revieweeId);

            return _mapper.Map<ReviewDto>(review);
        }

        public async Task<List<ReviewDto>> ForRide(Guid userId, string role, Guid rideId)
        {
            var ride = await _db.Rides.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rideId)
                ?? throw AppException.NotFound("Ride not found.");
            bool allowed = role is Roles.SupportAdmin or Roles.SuperAdmin
                           || ride.CustomerId == userId || ride.DriverId == userId;
            if (!allowed)
                throw AppException.Forbidden("You do not have access to this ride's reviews.");

            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RideId == rideId)
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        public async Task<List<ReviewDto>> ReceivedBy(Guid userId)
        {
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        public async Task<RatingSummaryDto> DriverRating(Guid driverUserId)
        {
            var ratings = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == driverUserId && r.RevieweeType == ReviewTargetType.Driver)
                .Select(r => r.Rating)
                .ToListAsync();

            return new RatingSummaryDto
            {
                UserId = driverUserId,
                Count = ratings.Count,
                Average = ratings.Count == 0 ? 0 : Math.Round(ratings.Average(), 2),
            };
        }

        // ---- helpers ---------------------------------------------------------

        private async Task<(string type, Guid id)> ResolveReviewee(Ride ride, bool reviewerIsCustomer, string? requestedType)
        {
            if (reviewerIsCustomer)
            {
                // Rider rates the driver.
                if (ride.DriverId is not Guid driverId)
                    throw AppException.Unprocessable("NO_DRIVER", "This ride had no driver to rate.");
                return (ReviewTargetType.Driver, driverId);
            }

            // Driver rates either the customer or (rental drivers) the vehicle owner.
            if (requestedType == ReviewTargetType.Owner)
            {
                if (ride.VehicleId is not Guid vehicleId)
                    throw AppException.Unprocessable("NO_VEHICLE", "This ride had no vehicle/owner to rate.");
                var vehicle = await _db.Vehicles.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vehicleId)
                    ?? throw AppException.NotFound("Vehicle not found.");
                return (ReviewTargetType.Owner, vehicle.OwnerId);
            }

            return (ReviewTargetType.Customer, ride.CustomerId);
        }

        private async Task RecomputeDriverRating(Guid driverUserId)
        {
            var avg = await _db.Reviews
                .Where(r => r.RevieweeId == driverUserId && r.RevieweeType == ReviewTargetType.Driver)
                .AverageAsync(r => (double?)r.Rating) ?? 0;

            var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == driverUserId);
            if (profile is not null)
            {
                profile.Rating = Math.Round(avg, 2);
                profile.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }
    }
}
