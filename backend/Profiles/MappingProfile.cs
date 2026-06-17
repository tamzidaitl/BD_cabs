using AutoMapper;
using BdCabs.Api.DTOs;
using BdCabs.Api.Models;

namespace BdCabs.Api.Profiles
{
    /// <summary>
    /// AutoMapper configuration. Entity → Read DTO mappings (and Create DTO →
    /// Entity for coupons). Auth DTOs are assembled by hand in AuthService since
    /// they combine token data with user data.
    /// </summary>
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserDto>();

            CreateMap<Coupon, CouponDto>();
            CreateMap<CouponCreateDto, Coupon>()
                // Server owns these; ignore whatever the client might send.
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.Status, o => o.Ignore())
                .ForMember(d => d.CreatedAt, o => o.Ignore())
                .ForMember(d => d.UpdatedAt, o => o.Ignore())
                .ForMember(d => d.ApplicableCities, o => o.MapFrom(s => s.ApplicableCities ?? new List<Guid>()))
                .ForMember(d => d.ApplicableRoles, o => o.MapFrom(s => s.ApplicableRoles ?? new List<string>()));
        }
    }
}
