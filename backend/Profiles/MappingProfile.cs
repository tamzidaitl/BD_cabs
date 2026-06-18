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

            // ---- Customer & Driver flows (flat read DTOs) ------------------
            // Ride / RecurringRide are hand-mapped in RideService (nested GeoPoint).
            CreateMap<DriverProfile, DriverProfileDto>();
            CreateMap<SavedPlace, SavedPlaceDto>();
            CreateMap<PaymentMethod, PaymentMethodDto>();
            CreateMap<Payment, PaymentDto>();
            CreateMap<Wallet, WalletDto>();
            CreateMap<WalletTransaction, WalletTransactionDto>();
            CreateMap<Review, ReviewDto>();
            CreateMap<SupportTicket, SupportTicketDto>();
            CreateMap<SafetyEvent, SafetyEventDto>();
            CreateMap<Vehicle, VehicleDto>();
            CreateMap<RentalAgreement, RentalAgreementDto>();
            CreateMap<RentPayment, RentPaymentDto>();
            CreateMap<DriverDocument, DriverDocumentDto>();

            // ---- Fleet / Vehicle Owner flows -------------------------------
            CreateMap<VehicleDocument, VehicleDocumentDto>();
            CreateMap<FleetProfile, FleetProfileDto>();
            CreateMap<FleetDriver, FleetDriverDto>();
        }
    }
}
