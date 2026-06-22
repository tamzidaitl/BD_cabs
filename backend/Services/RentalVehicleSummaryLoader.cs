using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Builds the lightweight <see cref="RentalVehicleSummaryDto"/> attached to rental
    /// agreements (photo, plate, and the owner's listed price/period). Shared by the
    /// owner's request list (<see cref="FleetService"/>) and the driver's agreements
    /// (<see cref="RentalService"/>) so both show the same car details.
    /// </summary>
    internal static class RentalVehicleSummaryLoader
    {
        public static async Task<Dictionary<Guid, RentalVehicleSummaryDto>> Load(
            AppDbContext db, IEnumerable<RentalAgreement> agreements)
        {
            var vehicleIds = agreements.Select(a => a.VehicleId).Distinct().ToList();
            if (vehicleIds.Count == 0)
                return new Dictionary<Guid, RentalVehicleSummaryDto>();

            return await db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id))
                .Select(v => new RentalVehicleSummaryDto
                {
                    Id = v.Id,
                    Type = v.Type,
                    PlateNumber = v.PlateNumber,
                    Make = v.Make,
                    Model = v.Model,
                    PhotoUrl = v.PhotoUrl,
                    RentalPriceMinor = v.RentalPriceMinor,
                    RentalPeriod = v.RentalPeriod,
                })
                .ToDictionaryAsync(v => v.Id);
        }
    }
}
