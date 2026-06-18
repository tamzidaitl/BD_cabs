using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IPaymentService
    {
        Task<List<PaymentMethodDto>> ListMethods(Guid userId);
        Task<PaymentMethodDto> AddMethod(Guid userId, PaymentMethodCreateDto dto);
        Task DeleteMethod(Guid userId, Guid id);
        Task<PaymentDto> ChargeRide(Guid userId, Guid rideId, ChargeRideDto dto);
        Task<List<PaymentDto>> History(Guid userId);
    }
}
