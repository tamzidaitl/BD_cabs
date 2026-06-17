using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface ICouponService
    {
        Task<List<CouponDto>> ListAll();
        Task<CouponDto> Create(CouponCreateDto dto);
        Task<CouponDto> SetStatus(Guid id, string status);
    }
}
