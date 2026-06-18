using BdCabs.Api.Common;
using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IRideService
    {
        // ---- Customer ----
        Task<FareEstimateResultDto> Estimate(RideEstimateDto dto);
        Task<List<NearbyVehicleDto>> NearbyVehicles(double lat, double lng, string? vehicleType);
        Task<RideCreatedDto> Request(Guid customerId, RideRequestDto dto);
        Task<RideDto> Cancel(Guid userId, string role, Guid rideId, string? reason);
        Task<RideDto> Get(Guid userId, string role, Guid rideId);
        Task<PagedResult<RideDto>> MyRides(Guid customerId, int page, int pageSize);
        Task<RideTrackDto> Track(Guid userId, string role, Guid rideId);
        Task<FareBreakdownDto> FareBreakdown(Guid userId, string role, Guid rideId);

        // ---- Recurring ----
        Task<RecurringRideDto> CreateRecurring(Guid customerId, RecurringRideCreateDto dto);
        Task<List<RecurringRideDto>> ListRecurring(Guid customerId);
        Task CancelRecurring(Guid customerId, Guid id);

        // ---- Driver ----
        Task<List<RideDto>> NearbyRequests(Guid driverUserId);
        Task<RideDto> Accept(Guid driverUserId, Guid rideId);
        Task<RideDto> Reject(Guid driverUserId, Guid rideId);
        Task<RideDto> Arrived(Guid driverUserId, Guid rideId);
        Task<RideDto> Start(Guid driverUserId, Guid rideId, string otp);
        Task<RideDto> Complete(Guid driverUserId, Guid rideId);
        Task<PagedResult<RideDto>> DriverTrips(Guid driverUserId, int page, int pageSize);
    }
}
