using BdCabs.Api.Common;
using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IOpsService
    {
        /// <summary>Live ops KPIs — keyed counters the dashboard renders directly.</summary>
        Task<Dictionary<string, int>> Dashboard();

        /// <summary>
        /// All rides for the ops console (paginated, newest first), enriched with the
        /// customer, driver, assigned vehicle and any problems flagged on the trip.
        /// Optionally filtered by ride status.
        /// </summary>
        Task<PagedResult<AdminRideDto>> Rides(string? status, int page, int pageSize);

        /// <summary>Drivers awaiting KYC verification (paginated list of their user records).</summary>
        Task<PagedResult<UserDto>> PendingDrivers(int page, int pageSize);

        /// <summary>Approve/reject a driver's KYC; approval activates the account.</summary>
        Task<UserDto> VerifyDriver(Guid userId, VerificationDecisionDto dto);

        /// <summary>Vehicles awaiting verification (paginated), enriched with owner + documents.</summary>
        Task<PagedResult<VehicleVerificationDto>> PendingVehicles(int page, int pageSize);

        /// <summary>Approve/reject a vehicle's verification.</summary>
        Task<VehicleDto> VerifyVehicle(Guid vehicleId, VerificationDecisionDto dto);
    }
}
