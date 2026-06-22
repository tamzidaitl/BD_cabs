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
            bool isStaff = role is Roles.SupportAdmin or Roles.SuperAdmin;
            bool allowed = isStaff || ride.CustomerId == userId || ride.DriverId == userId;
            if (!allowed)
                throw AppException.Forbidden("You do not have access to this ride's reviews.");

            // Staff (moderators) see everything; the two parties see only visible reviews.
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RideId == rideId && (isStaff || r.Status == ReviewStatus.Visible))
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        public async Task<ReviewDto> CreateRentalReview(Guid reviewerId, Guid agreementId, RentalReviewCreateDto dto)
        {
            var agreement = await _db.RentalAgreements.FirstOrDefaultAsync(a => a.Id == agreementId)
                ?? throw AppException.NotFound("Rental agreement not found.");
            if (agreement.DriverId != reviewerId)
                throw AppException.Forbidden("This rental agreement does not belong to you.");
            if (agreement.Status != RentalStatus.Ended)
                throw AppException.Unprocessable("RENTAL_NOT_ENDED", "You can only review a rental once it has ended.");

            // A rental driver rates the car they rented and its Fleet Owner — nothing else.
            if (dto.RevieweeType is not (ReviewTargetType.Vehicle or ReviewTargetType.Owner))
                throw AppException.BadRequest("You can only rate the vehicle or the owner.", "INVALID_TARGET");
            var revieweeId = dto.RevieweeType == ReviewTargetType.Vehicle ? agreement.VehicleId : agreement.OwnerId;

            bool dup = await _db.Reviews.AnyAsync(r =>
                r.RentalAgreementId == agreementId && r.ReviewerId == reviewerId && r.RevieweeType == dto.RevieweeType);
            if (dup)
                throw AppException.Conflict("You have already submitted this review.", "REVIEW_EXISTS");

            var now = DateTime.UtcNow;
            var review = new Review
            {
                Id = Guid.NewGuid(),
                RideId = null,
                RentalAgreementId = agreementId,
                ReviewerId = reviewerId,
                RevieweeId = revieweeId,
                RevieweeType = dto.RevieweeType,
                Rating = dto.Rating,
                Comment = dto.Comment,
                Tags = dto.Tags ?? new List<string>(),
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.Reviews.Add(review);
            await _db.SaveChangesAsync();

            await RecomputeAggregate(review.RevieweeType, review.RevieweeId);
            return _mapper.Map<ReviewDto>(review);
        }

        public async Task<List<ReviewDto>> ForRentalAgreement(Guid userId, string role, Guid agreementId)
        {
            var agreement = await _db.RentalAgreements.AsNoTracking().FirstOrDefaultAsync(a => a.Id == agreementId)
                ?? throw AppException.NotFound("Rental agreement not found.");
            bool isStaff = role is Roles.SupportAdmin or Roles.SuperAdmin;
            bool allowed = isStaff || agreement.DriverId == userId || agreement.OwnerId == userId;
            if (!allowed)
                throw AppException.Forbidden("You do not have access to this agreement's reviews.");

            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RentalAgreementId == agreementId && (isStaff || r.Status == ReviewStatus.Visible))
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        public async Task<List<ReviewDto>> ReceivedBy(Guid userId)
        {
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == userId && r.Status == ReviewStatus.Visible)
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();
            return _mapper.Map<List<ReviewDto>>(reviews);
        }

        public async Task<RatingSummaryDto> DriverRating(Guid driverUserId)
        {
            var ratings = await _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == driverUserId && r.RevieweeType == ReviewTargetType.Driver
                            && r.Status == ReviewStatus.Visible)
                .Select(r => r.Rating)
                .ToListAsync();

            return new RatingSummaryDto
            {
                UserId = driverUserId,
                Count = ratings.Count,
                Average = ratings.Count == 0 ? 0 : Math.Round(ratings.Average(), 2),
            };
        }

        public async Task<ProfileReviewsDto> MyReviews(Guid userId)
        {
            var visible = _db.Reviews.AsNoTracking()
                .Where(r => r.RevieweeId == userId && r.Status == ReviewStatus.Visible);

            int count = await visible.CountAsync();
            double average = count == 0 ? 0 : Math.Round(await visible.AverageAsync(r => (double)r.Rating), 2);

            var reviews = await visible
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();

            // Enrich each review with the reviewer's name + avatar so the user can see
            // (and picture) who rated them.
            var reviewerIds = reviews.Select(r => r.ReviewerId).Distinct().ToList();
            var profiles = await _db.Users.AsNoTracking()
                .Where(u => reviewerIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.AvatarUrl })
                .ToDictionaryAsync(u => u.Id);
            var dtos = _mapper.Map<List<ReviewDto>>(reviews);
            foreach (var dto in dtos)
                if (profiles.TryGetValue(dto.ReviewerId, out var p))
                {
                    dto.ReviewerName = p.FullName;
                    dto.ReviewerAvatarUrl = p.AvatarUrl;
                }

            return new ProfileReviewsDto
            {
                Summary = new RatingSummaryDto { UserId = userId, Count = count, Average = average },
                Reviews = dtos,
            };
        }

        // ---- Moderation (Super Admin / Support Admin) ------------------------

        public async Task<PagedResult<AdminReviewDto>> ListForModeration(string? status, string? revieweeType, int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var query = _db.Reviews.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(r => r.Status == status);
            if (!string.IsNullOrWhiteSpace(revieweeType)) query = query.Where(r => r.RevieweeType == revieweeType);

            int totalCount = await query.CountAsync();
            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var names = await NamesFor(reviews.SelectMany(r => new[] { r.ReviewerId, r.RevieweeId }));
            var items = reviews.Select(r => ToAdminDto(r, names)).ToList();
            return PagedResult<AdminReviewDto>.Create(items, totalCount, page, pageSize);
        }

        public async Task<AdminReviewDto> Moderate(Guid moderatorId, Guid reviewId, ReviewModerationDto dto)
        {
            if (!ReviewModerationAction.IsValid(dto.Action))
                throw AppException.BadRequest(
                    $"Invalid action. Allowed: {string.Join(", ", ReviewModerationAction.All)}.", "INVALID_ACTION");

            var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId)
                ?? throw AppException.NotFound("Review not found.");

            var now = DateTime.UtcNow;
            review.Status = dto.Action switch
            {
                ReviewModerationAction.Hide => ReviewStatus.Hidden,
                ReviewModerationAction.Remove => ReviewStatus.Removed,
                _ => ReviewStatus.Visible, // unhide
            };
            review.ModeratedBy = moderatorId;
            review.ModeratedAt = now;
            review.ModerationReason = dto.Reason?.Trim();
            review.UpdatedAt = now;
            await _db.SaveChangesAsync();

            // Visibility changed → refresh the reviewee's stored aggregate rating.
            await RecomputeAggregate(review.RevieweeType, review.RevieweeId);

            var names = await NamesFor(new[] { review.ReviewerId, review.RevieweeId });
            return ToAdminDto(review, names);
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
                // Owner-drivers drive their own car — there is no separate owner to rate.
                if (vehicle.OwnerId == ride.DriverId)
                    throw AppException.Unprocessable("OWN_VEHICLE", "You drove your own vehicle — there is no owner to rate.");
                return (ReviewTargetType.Owner, vehicle.OwnerId);
            }

            return (ReviewTargetType.Customer, ride.CustomerId);
        }

        private async Task RecomputeDriverRating(Guid driverUserId)
        {
            var avg = await _db.Reviews
                .Where(r => r.RevieweeId == driverUserId && r.RevieweeType == ReviewTargetType.Driver
                            && r.Status == ReviewStatus.Visible)
                .AverageAsync(r => (double?)r.Rating) ?? 0;

            var profile = await _db.DriverProfiles.FirstOrDefaultAsync(d => d.UserId == driverUserId);
            if (profile is not null)
            {
                profile.Rating = Math.Round(avg, 2);
                profile.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        /// <summary>Recompute the reviewee's stored aggregate rating (visible reviews
        /// only) on the right profile for their reviewee type. Customers have no
        /// stored aggregate, so they are skipped.</summary>
        private async Task RecomputeAggregate(string revieweeType, Guid revieweeId)
        {
            var avg = await _db.Reviews
                .Where(r => r.RevieweeId == revieweeId && r.RevieweeType == revieweeType
                            && r.Status == ReviewStatus.Visible)
                .AverageAsync(r => (double?)r.Rating);
            double? rounded = avg.HasValue ? Math.Round(avg.Value, 2) : null;
            var now = DateTime.UtcNow;

            switch (revieweeType)
            {
                case ReviewTargetType.Driver:
                    var d = await _db.DriverProfiles.FirstOrDefaultAsync(p => p.UserId == revieweeId);
                    if (d is not null) { d.Rating = rounded ?? 0; d.UpdatedAt = now; }
                    break;
                case ReviewTargetType.Owner:
                    var f = await _db.FleetProfiles.FirstOrDefaultAsync(p => p.UserId == revieweeId);
                    if (f is not null) { f.Rating = rounded; f.UpdatedAt = now; }
                    break;
                case ReviewTargetType.Vehicle:
                    var v = await _db.Vehicles.FirstOrDefaultAsync(x => x.Id == revieweeId);
                    if (v is not null) { v.Rating = rounded; v.UpdatedAt = now; }
                    break;
                case ReviewTargetType.Corporate:
                    var c = await _db.CorporateProfiles.FirstOrDefaultAsync(p => p.UserId == revieweeId);
                    if (c is not null) { c.Rating = rounded; c.UpdatedAt = now; }
                    break;
            }
            await _db.SaveChangesAsync();
        }

        /// <summary>Map of userId → full name for the given ids (used to enrich moderation rows).</summary>
        private async Task<Dictionary<Guid, string>> NamesFor(IEnumerable<Guid> ids)
        {
            var distinct = ids.Distinct().ToList();
            return await _db.Users.AsNoTracking()
                .Where(u => distinct.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName);
        }

        private static AdminReviewDto ToAdminDto(Review r, IReadOnlyDictionary<Guid, string> names) => new()
        {
            Id = r.Id,
            RideId = r.RideId,
            RentalAgreementId = r.RentalAgreementId,
            ReviewerId = r.ReviewerId,
            ReviewerName = names.GetValueOrDefault(r.ReviewerId),
            RevieweeId = r.RevieweeId,
            RevieweeName = names.GetValueOrDefault(r.RevieweeId),
            RevieweeType = r.RevieweeType,
            Rating = r.Rating,
            Comment = r.Comment,
            Tags = r.Tags,
            Status = r.Status,
            ModeratedBy = r.ModeratedBy,
            ModeratedAt = r.ModeratedAt,
            ModerationReason = r.ModerationReason,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
        };
    }
}
