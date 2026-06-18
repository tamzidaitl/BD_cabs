using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IPlaceService
    {
        Task<List<SavedPlaceDto>> List(Guid userId);
        Task<SavedPlaceDto> Create(Guid userId, SavedPlaceCreateDto dto);
        Task<SavedPlaceDto> Update(Guid userId, Guid id, SavedPlaceCreateDto dto);
        Task Delete(Guid userId, Guid id);
        Task<List<RecentPlaceDto>> Recent(Guid userId);
    }
}
