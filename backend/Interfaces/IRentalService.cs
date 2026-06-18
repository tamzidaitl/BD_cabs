using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IRentalService
    {
        Task<List<VehicleDto>> AvailableVehicles();
        Task<RentalAgreementDto> RequestRental(Guid driverUserId, RentalRequestDto dto);
        Task<List<RentalAgreementDto>> Mine(Guid driverUserId);
        Task<RentDueDto> RentDue(Guid driverUserId, Guid agreementId);
        Task<RentPaymentDto> PayRent(Guid driverUserId, Guid agreementId, PayRentDto dto);
    }
}
