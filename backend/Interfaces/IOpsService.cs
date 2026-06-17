using BdCabs.Api.Common;
using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IOpsService
    {
        /// <summary>Live ops KPIs — keyed counters the dashboard renders directly.</summary>
        Task<Dictionary<string, int>> Dashboard();

        /// <summary>Drivers awaiting KYC verification (paginated list of their user records).</summary>
        Task<PagedResult<UserDto>> PendingDrivers(int page, int pageSize);
    }
}
