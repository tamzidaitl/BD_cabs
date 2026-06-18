using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    /// <summary>
    /// Vehicle registration &amp; lifecycle for Fleet/Vehicle Owners and owner-drivers
    /// (API_ENDPOINTS.md §4). Verification of submitted vehicles/documents is an Ops
    /// responsibility.
    /// </summary>
    public interface IVehicleService
    {
        Task<VehicleDto> Create(Guid ownerId, VehicleCreateDto dto);
        Task<List<VehicleDto>> ListMine(Guid ownerId);
        Task<VehicleDto> Update(Guid ownerId, Guid vehicleId, VehicleUpdateDto dto);
        Task Remove(Guid ownerId, Guid vehicleId);
        Task<VehicleDto> SetStatus(Guid ownerId, Guid vehicleId, VehicleStatusDto dto);
        Task<VehicleDocumentDto> AddDocument(Guid ownerId, Guid vehicleId, VehicleDocumentCreateDto dto);
        Task<List<VehicleDocumentDto>> ListDocuments(Guid ownerId, Guid vehicleId);
    }
}
