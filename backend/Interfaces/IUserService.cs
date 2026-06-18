using BdCabs.Api.Common;
using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IUserService
    {
        Task<PagedResult<UserDto>> List(int page, int pageSize, string? search, string? role);
        Task<UserDto> GetById(Guid id);
        Task<UserDto> SetStatus(Guid id, string status);
        Task DeleteUser(Guid id);
        Task<UserDto> CreateStaff(CreateStaffDto dto);
    }
}
