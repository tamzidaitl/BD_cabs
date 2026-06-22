using System.Linq.Expressions;
using BdCabs.Api.Data;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Rental-agreement lifecycle transitions that aren't driven by an explicit user
    /// action. Currently: ending an agreement once its owner-set end date has passed.
    /// Run lazily when either party lists their agreements, so an expired rental drops
    /// out of the active list (and frees the car) without a background job.
    /// </summary>
    internal static class RentalLifecycle
    {
        /// <summary>Marks any Active agreement matching <paramref name="scope"/> whose
        /// <c>EndDate</c> has passed as <see cref="RentalStatus.Ended"/>. Returns the
        /// number of agreements ended. A no-op (no write) when none are due.</summary>
        public static async Task<int> EndExpired(
            AppDbContext db, Expression<Func<RentalAgreement, bool>> scope, DateTime now)
        {
            return await db.RentalAgreements
                .Where(scope)
                .Where(a => a.Status == RentalStatus.Active && a.EndDate != null && a.EndDate <= now)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(a => a.Status, RentalStatus.Ended)
                    .SetProperty(a => a.UpdatedAt, now));
        }
    }
}
