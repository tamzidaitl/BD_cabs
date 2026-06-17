using BdCabs.Api.Interfaces;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Finance operations. The payout engine and transaction ledger
    /// (API_ENDPOINTS.md §8/§13b) are not part of this slice, so these return
    /// well-shaped placeholder summaries the admin UI can render today.
    /// </summary>
    public class FinanceService : IFinanceService
    {
        public Task<object> RunPayouts()
        {
            // A real implementation would enqueue a payout job and persist the run.
            var result = new { runId = Guid.NewGuid().ToString(), status = "queued", startedAt = DateTime.UtcNow };
            return Task.FromResult<object>(result);
        }

        public Task<object> Reports(DateTime? from, DateTime? to)
        {
            var report = new
            {
                from,
                to,
                currency = "BDT",
                grossRevenue = 0,
                platformCommission = 0,
                driverPayouts = 0,
                couponCost = 0,
                generatedAt = DateTime.UtcNow,
            };
            return Task.FromResult<object>(report);
        }
    }
}
