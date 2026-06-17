namespace BdCabs.Api.Interfaces
{
    public interface IFinanceService
    {
        /// <summary>Kicks off a payout cycle. Returns the run identifier the UI can poll.</summary>
        Task<object> RunPayouts();

        /// <summary>Financial summary for a date range (revenue, commissions, coupon cost).</summary>
        Task<object> Reports(DateTime? from, DateTime? to);
    }
}
