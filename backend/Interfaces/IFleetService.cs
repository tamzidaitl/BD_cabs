using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    /// <summary>
    /// Fleet/Vehicle Owner operations (API_ENDPOINTS.md §4b): owner KYC, the driver
    /// roster, rental-request approval and terms, rent received, and performance /
    /// revenue / settlement reporting.
    /// </summary>
    public interface IFleetService
    {
        Task<FleetProfileDto> Onboard(Guid ownerId, FleetOnboardingDto dto);
        Task<FleetProfileDto> GetProfile(Guid ownerId);

        Task<List<VehicleDto>> Vehicles(Guid ownerId);

        Task<List<FleetDriverDto>> Drivers(Guid ownerId);
        Task<FleetDriverDto> InviteDriver(Guid ownerId, FleetDriverInviteDto dto);
        Task RemoveDriver(Guid ownerId, Guid driverId);

        Task<List<RentalAgreementDto>> RentalRequests(Guid ownerId);
        Task<RentalAgreementDto> ApproveRental(Guid ownerId, Guid agreementId, ApproveRentalDto dto);
        Task<RentalAgreementDto> RejectRental(Guid ownerId, Guid agreementId, RejectRentalDto dto);
        Task<RentalAgreementDto> UpdateTerms(Guid ownerId, Guid agreementId, UpdateRentalTermsDto dto);
        Task<RentReceivedDto> RentReceived(Guid ownerId, Guid agreementId);

        Task<List<VehiclePerformanceDto>> Performance(Guid ownerId);
        Task<RevenueReportDto> Revenue(Guid ownerId, DateTime? from, DateTime? to);
        Task<List<SettlementDto>> Settlements(Guid ownerId);

        Task<List<ReviewDto>> ReviewsReceived(Guid ownerId);
        Task<ReviewDto> ReviewDriver(Guid ownerId, FleetDriverReviewInputDto dto);

        // Corporate rental contracts (Corporate ↔ Vehicle Owner)
        Task<List<CorporateRentalContractDto>> CorporateRentalRequests(Guid ownerId);
        Task<CorporateRentalContractDto> ApproveCorporateRental(Guid ownerId, Guid contractId, ApproveCorporateRentalDto dto);
        Task<CorporateRentalContractDto> RejectCorporateRental(Guid ownerId, Guid contractId, RejectRentalDto dto);
        Task<CorporateRentalContractDto> ActivateCorporateRental(Guid ownerId, Guid contractId);
        Task<CorporateRentalContractDto> CompleteCorporateRental(Guid ownerId, Guid contractId);
        Task<CorporateRentalContractDto> AssignDriver(Guid ownerId, Guid contractId, AssignRentalDriverDto dto);
        Task<CorporateRentalContractDto> UnassignDriver(Guid ownerId, Guid contractId, Guid driverId);
        Task<ReviewDto> CreateCorporateReview(Guid ownerId, FleetCorporateReviewInputDto dto);
    }
}
