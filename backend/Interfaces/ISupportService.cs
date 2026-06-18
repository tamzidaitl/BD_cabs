using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface ISupportService
    {
        Task<SupportTicketDto> Create(Guid userId, SupportTicketCreateDto dto);
        Task<List<SupportTicketDto>> ListMine(Guid userId);
        Task<SupportTicketDto> Get(Guid userId, string role, Guid id);
    }

    public interface ISafetyService
    {
        Task<SafetyEventDto> RaiseSos(Guid userId, SosDto dto);
        Task<SafetyEventDto> ShareTrip(Guid userId, ShareTripDto dto);
    }
}
