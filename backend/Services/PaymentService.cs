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
    /// Payment methods + ride charges (API_ENDPOINTS.md §8). The external gateway
    /// is out of this slice, so charges settle synchronously: wallet payments debit
    /// the in-app wallet; other methods are recorded as Paid. Amount charged is the
    /// net fare (after coupon discount) plus any cancellation fee.
    /// </summary>
    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly IWalletService _wallet;

        public PaymentService(AppDbContext db, IMapper mapper, IWalletService wallet)
        {
            _db = db;
            _mapper = mapper;
            _wallet = wallet;
        }

        public async Task<List<PaymentMethodDto>> ListMethods(Guid userId)
        {
            var methods = await _db.PaymentMethods.AsNoTracking()
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.IsDefault).ThenByDescending(m => m.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<PaymentMethodDto>>(methods);
        }

        public async Task<PaymentMethodDto> AddMethod(Guid userId, PaymentMethodCreateDto dto)
        {
            if (!PaymentMethodType.IsValid(dto.Type))
                throw AppException.BadRequest($"Invalid type. Allowed: {string.Join(", ", PaymentMethodType.All)}.", "INVALID_PAYMENT_METHOD");

            var now = DateTime.UtcNow;
            var method = new PaymentMethod
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = dto.Type,
                Label = dto.Label,
                Last4 = dto.Last4,
                ProviderToken = dto.ProviderToken,
                IsDefault = dto.IsDefault,
                CreatedAt = now,
                UpdatedAt = now,
            };

            if (dto.IsDefault)
                await ClearDefault(userId);

            _db.PaymentMethods.Add(method);
            await _db.SaveChangesAsync();
            return _mapper.Map<PaymentMethodDto>(method);
        }

        public async Task DeleteMethod(Guid userId, Guid id)
        {
            var method = await _db.PaymentMethods.FirstOrDefaultAsync(m => m.Id == id)
                ?? throw AppException.NotFound("Payment method not found.");
            if (method.UserId != userId)
                throw AppException.Forbidden("This payment method does not belong to you.");
            _db.PaymentMethods.Remove(method);
            await _db.SaveChangesAsync();
        }

        public async Task<PaymentDto> ChargeRide(Guid userId, Guid rideId, ChargeRideDto dto)
        {
            var ride = await _db.Rides.FirstOrDefaultAsync(r => r.Id == rideId)
                ?? throw AppException.NotFound("Ride not found.");
            if (ride.CustomerId != userId)
                throw AppException.Forbidden("This ride does not belong to you.");

            // Idempotent: return the existing successful charge if already paid.
            var existing = await _db.Payments.FirstOrDefaultAsync(p => p.RideId == rideId && p.Status == PaymentStatus.Paid);
            if (existing is not null) return _mapper.Map<PaymentDto>(existing);

            if (ride.Status is not (RideStatus.Completed or RideStatus.Cancelled))
                throw AppException.Unprocessable("RIDE_NOT_CHARGEABLE", "Only completed or cancelled rides can be charged.");

            int gross = ride.FinalFareMinor ?? ride.FareEstimateMinor;
            int amount = ride.Status == RideStatus.Cancelled
                ? ride.CancellationFeeMinor
                : Math.Max(0, gross - ride.DiscountMinor);

            var method = dto.Method ?? ride.PaymentMethod;
            if (!PaymentMethodType.IsValid(method))
                throw AppException.BadRequest($"Invalid method. Allowed: {string.Join(", ", PaymentMethodType.All)}.", "INVALID_PAYMENT_METHOD");

            if (amount > 0 && method == PaymentMethodType.Wallet)
                await _wallet.Debit(userId, amount, WalletTxnType.RidePayment, $"Ride {ride.Id} payment");

            var now = DateTime.UtcNow;
            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                RideId = ride.Id,
                CustomerId = userId,
                Currency = ride.Currency,
                AmountMinor = amount,
                Method = method,
                Status = PaymentStatus.Paid,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.Payments.Add(payment);
            await _db.SaveChangesAsync();
            return _mapper.Map<PaymentDto>(payment);
        }

        public async Task<List<PaymentDto>> History(Guid userId)
        {
            var payments = await _db.Payments.AsNoTracking()
                .Where(p => p.CustomerId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .Take(200)
                .ToListAsync();
            return _mapper.Map<List<PaymentDto>>(payments);
        }

        private async Task ClearDefault(Guid userId)
        {
            var current = await _db.PaymentMethods.Where(m => m.UserId == userId && m.IsDefault).ToListAsync();
            foreach (var m in current) m.IsDefault = false;
        }
    }
}
