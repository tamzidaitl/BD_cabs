using BdCabs.Api.DTOs;
using BdCabs.Api.Models;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Hand-written Ride/RecurringRide → DTO mapping. Done by hand (not AutoMapper)
    /// because the flat lat/lng/address columns are re-composed into nested
    /// <see cref="GeoPointDto"/> objects to match the frontend `GeoPoint` shape.
    /// </summary>
    public static class RideMapper
    {
        public static RideDto ToDto(Ride r) => new()
        {
            Id = r.Id,
            CustomerId = r.CustomerId,
            DriverId = r.DriverId,
            VehicleId = r.VehicleId,
            VehicleTypeId = r.VehicleTypeId,
            Status = r.Status,
            Pickup = new GeoPointDto { Lat = r.PickupLat, Lng = r.PickupLng, Address = r.PickupAddress },
            Destination = new GeoPointDto { Lat = r.DestLat, Lng = r.DestLng, Address = r.DestAddress },
            DistanceMeters = r.DistanceMeters,
            DurationSeconds = r.DurationSeconds,
            Currency = r.Currency,
            FareEstimateMinor = r.FareEstimateMinor,
            FinalFareMinor = r.FinalFareMinor,
            DiscountMinor = r.DiscountMinor,
            CouponCode = r.CouponCode,
            PaymentMethod = r.PaymentMethod,
            Notes = r.Notes,
            ScheduledFor = r.ScheduledFor,
            CancelledBy = r.CancelledBy,
            CancelReason = r.CancelReason,
            CancellationFeeMinor = r.CancellationFeeMinor,
            RequestedAt = r.RequestedAt,
            AcceptedAt = r.AcceptedAt,
            ArrivedAt = r.ArrivedAt,
            StartedAt = r.StartedAt,
            CompletedAt = r.CompletedAt,
            CancelledAt = r.CancelledAt,
        };

        /// <summary>As <see cref="ToDto(Ride)"/>, plus the customer summary the driver
        /// sees in the nearby-requests feed. Separate overload (not an optional arg) so
        /// the single-arg method group still binds in <c>.Select(RideMapper.ToDto)</c>.</summary>
        public static RideDto ToDto(Ride r, User? customer)
        {
            var dto = ToDto(r);
            if (customer is not null)
            {
                dto.Customer = new RideCustomerDto
                {
                    Id = customer.Id,
                    FullName = customer.FullName,
                    AvatarUrl = customer.AvatarUrl,
                };
            }
            return dto;
        }

        public static RecurringRideDto ToDto(RecurringRide r) => new()
        {
            Id = r.Id,
            CustomerId = r.CustomerId,
            Pickup = new GeoPointDto { Lat = r.PickupLat, Lng = r.PickupLng, Address = r.PickupAddress },
            Destination = new GeoPointDto { Lat = r.DestLat, Lng = r.DestLng, Address = r.DestAddress },
            VehicleTypeId = r.VehicleTypeId,
            PaymentMethod = r.PaymentMethod,
            DaysOfWeek = r.DaysOfWeek,
            TimeOfDay = r.TimeOfDay,
            StartDate = r.StartDate,
            EndDate = r.EndDate,
            Active = r.Active,
            CreatedAt = r.CreatedAt,
        };
    }
}
