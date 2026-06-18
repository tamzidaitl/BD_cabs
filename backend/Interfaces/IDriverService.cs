using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IDriverService
    {
        Task<DriverProfileDto> GetMine(Guid userId);
        Task<DriverProfileDto> Onboard(Guid userId, DriverOnboardingDto dto);
        Task<DriverProfileDto> Update(Guid userId, DriverUpdateDto dto);
        Task<DriverProfileDto> SetAvailability(Guid userId, AvailabilityDto dto);
        Task<DriverProfileDto> UpdateLocation(Guid userId, DriverLocationDto dto);
        Task<DriverDocumentDto> AddDocument(Guid userId, DriverDocumentCreateDto dto);
        Task<List<DriverDocumentDto>> ListDocuments(Guid userId);
        Task<DriverEarningsDto> Earnings(Guid userId);
    }
}
