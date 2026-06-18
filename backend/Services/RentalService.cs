using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// The rental relationship for rental drivers (API_ENDPOINTS.md §3 Rental): a
    /// driver browses owner-offered vehicles, requests one, and — once the owner
    /// approves and sets terms — pays rent. Owner approval/terms live on the Fleet
    /// Owner side (§4b); this service covers the driver's half plus rent payments.
    /// </summary>
    public class RentalService : IRentalService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly IWalletService _wallet;

        public RentalService(AppDbContext db, IMapper mapper, IWalletService wallet)
        {
            _db = db;
            _mapper = mapper;
            _wallet = wallet;
        }

        public async Task<List<VehicleDto>> AvailableVehicles()
        {
            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => v.ForRent && v.IsActive && v.VerificationStatus == VerificationStatus.Approved)
                .OrderByDescending(v => v.UpdatedAt)
                .ToListAsync();
            return _mapper.Map<List<VehicleDto>>(vehicles);
        }

        public async Task<RentalAgreementDto> RequestRental(Guid driverUserId, RentalRequestDto dto)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == dto.VehicleId)
                ?? throw AppException.NotFound("Vehicle not found.");
            if (!vehicle.ForRent)
                throw AppException.Unprocessable("VEHICLE_NOT_FOR_RENT", "This vehicle is not offered for rent.");

            bool duplicate = await _db.RentalAgreements.AnyAsync(a =>
                a.VehicleId == vehicle.Id && a.DriverId == driverUserId &&
                (a.Status == RentalStatus.Requested || a.Status == RentalStatus.Approved || a.Status == RentalStatus.Active));
            if (duplicate)
                throw AppException.Conflict("You already have a pending or active request for this vehicle.", "RENTAL_REQUEST_EXISTS");

            var now = DateTime.UtcNow;
            var agreement = new RentalAgreement
            {
                Id = Guid.NewGuid(),
                VehicleId = vehicle.Id,
                OwnerId = vehicle.OwnerId,
                DriverId = driverUserId,
                Status = RentalStatus.Requested,
                Note = dto.Note,
                RequestedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.RentalAgreements.Add(agreement);
            await _db.SaveChangesAsync();
            return _mapper.Map<RentalAgreementDto>(agreement);
        }

        public async Task<List<RentalAgreementDto>> Mine(Guid driverUserId)
        {
            var agreements = await _db.RentalAgreements.AsNoTracking()
                .Where(a => a.DriverId == driverUserId)
                .OrderByDescending(a => a.RequestedAt)
                .ToListAsync();
            return _mapper.Map<List<RentalAgreementDto>>(agreements);
        }

        public async Task<RentDueDto> RentDue(Guid driverUserId, Guid agreementId)
        {
            var agreement = await GetOwned(driverUserId, agreementId);
            var period = DateTime.UtcNow.ToString("yyyy-MM");

            int due;
            if (agreement.RentType == RentType.RevenueShare)
            {
                // Owner's accrued share from this driver's completed rides on the vehicle…
                int accrued = await _db.Rides.AsNoTracking()
                    .Where(r => r.VehicleId == agreement.VehicleId && r.DriverId == driverUserId && r.Status == RideStatus.Completed)
                    .SumAsync(r => r.OwnerCutMinor);
                int paid = await _db.RentPayments.AsNoTracking()
                    .Where(p => p.RentalAgreementId == agreement.Id && p.Status == PaymentStatus.Paid)
                    .SumAsync(p => p.AmountMinor);
                due = Math.Max(0, accrued - paid);
            }
            else
            {
                // Fixed rent for the current period, less anything already paid this period.
                int rent = agreement.RentAmountMinor ?? 0;
                int paidThisPeriod = await _db.RentPayments.AsNoTracking()
                    .Where(p => p.RentalAgreementId == agreement.Id && p.Period == period && p.Status == PaymentStatus.Paid)
                    .SumAsync(p => p.AmountMinor);
                due = Math.Max(0, rent - paidThisPeriod);
            }

            return new RentDueDto
            {
                RentalAgreementId = agreement.Id,
                Currency = "BDT",
                AmountDueMinor = due,
                RentType = agreement.RentType ?? RentType.Fixed,
                Period = period,
            };
        }

        public async Task<RentPaymentDto> PayRent(Guid driverUserId, Guid agreementId, PayRentDto dto)
        {
            var agreement = await GetOwned(driverUserId, agreementId);
            if (agreement.Status is not (RentalStatus.Active or RentalStatus.Approved))
                throw AppException.Unprocessable("RENTAL_NOT_ACTIVE", "Rent can only be paid on an approved/active agreement.");
            if (dto.AmountMinor <= 0)
                throw AppException.BadRequest("Amount must be positive.", "INVALID_AMOUNT");

            var now = DateTime.UtcNow;
            var payment = new RentPayment
            {
                Id = Guid.NewGuid(),
                RentalAgreementId = agreement.Id,
                DriverId = driverUserId,
                OwnerId = agreement.OwnerId,
                Currency = "BDT",
                AmountMinor = dto.AmountMinor,
                Status = PaymentStatus.Paid,
                Period = dto.Period ?? now.ToString("yyyy-MM"),
                CreatedAt = now,
            };
            _db.RentPayments.Add(payment);
            await _db.SaveChangesAsync();

            // Rent flows to the vehicle owner's wallet.
            await _wallet.Credit(agreement.OwnerId, dto.AmountMinor, WalletTxnType.RentPayment, $"Rent for agreement {agreement.Id}");

            return _mapper.Map<RentPaymentDto>(payment);
        }

        private async Task<RentalAgreement> GetOwned(Guid driverUserId, Guid agreementId)
        {
            var agreement = await _db.RentalAgreements.FirstOrDefaultAsync(a => a.Id == agreementId)
                ?? throw AppException.NotFound("Rental agreement not found.");
            if (agreement.DriverId != driverUserId)
                throw AppException.Forbidden("This rental agreement does not belong to you.");
            return agreement;
        }
    }
}
