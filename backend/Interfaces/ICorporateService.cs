using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    /// <summary>
    /// Corporate Client operations (role_wise_story.md §4): company KYC/billing,
    /// the employee roster with per-employee spend limits and approval rules,
    /// booking rides for employees (with an approval queue), recurring schedules,
    /// company billing, consolidated trip/spend reporting, and reviewing
    /// Fleet/Vehicle Owners.
    /// </summary>
    public interface ICorporateService
    {
        // Profile / KYC / billing
        Task<CorporateProfileDto> Onboard(Guid corporateId, CorporateOnboardingDto dto);
        Task<CorporateProfileDto> GetProfile(Guid corporateId);

        // Employees
        Task<List<CorporateEmployeeDto>> Employees(Guid corporateId);
        Task<CorporateEmployeeDto> AddEmployee(Guid corporateId, CorporateEmployeeInputDto dto);
        Task<CorporateEmployeeDto> UpdateEmployee(Guid corporateId, Guid employeeId, CorporateEmployeeInputDto dto);
        Task RemoveEmployee(Guid corporateId, Guid employeeId);

        // Bookings
        Task<List<CorporateBookingDto>> Bookings(Guid corporateId, string? status);
        Task<CorporateBookingEstimateResultDto> EstimateBooking(Guid corporateId, CorporateBookingEstimateDto dto);
        Task<CorporateBookingDto> CreateBooking(Guid corporateId, CorporateBookingInputDto dto);
        Task<CorporateBookingDto> ApproveBooking(Guid corporateId, Guid bookingId);
        Task<CorporateBookingDto> RejectBooking(Guid corporateId, Guid bookingId, RejectBookingDto dto);
        Task<CorporateBookingDto> CompleteBooking(Guid corporateId, Guid bookingId);
        Task<CorporateBookingDto> CancelBooking(Guid corporateId, Guid bookingId);

        // Recurring rides
        Task<List<CorporateRecurringRideDto>> RecurringRides(Guid corporateId);
        Task<CorporateRecurringRideDto> CreateRecurring(Guid corporateId, CorporateRecurringRideInputDto dto);
        Task CancelRecurring(Guid corporateId, Guid recurringId);

        // Billing & reporting
        Task<CorporateBillingDto> Billing(Guid corporateId);
        Task<CorporateReportDto> Reports(Guid corporateId, DateTime? from, DateTime? to);

        // Vehicle rental contracts (Corporate ↔ Vehicle Owner)
        Task<List<CorporateRentalVehicleDto>> RentalVehicles();
        Task<List<CorporateRentalContractDto>> RentalContracts(Guid corporateId);
        Task<CorporateRentalContractDto> RequestRentalContract(Guid corporateId, CorporateRentalRequestDto dto);
        Task<CorporateRentalContractDto> CancelRentalContract(Guid corporateId, Guid contractId);

        // Reviews of Fleet/Vehicle owners (+ reviews received from them)
        Task<List<CorporateFleetSummaryDto>> Fleets(Guid corporateId);
        Task<List<ReviewDto>> Reviews(Guid corporateId);
        Task<List<ReviewDto>> ReviewsReceived(Guid corporateId);
        Task<ReviewDto> CreateReview(Guid corporateId, CorporateReviewInputDto dto);
    }
}
