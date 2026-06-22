using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// Corporate Client business profile and KYC (role_wise_story.md §4). Attached
    /// to a <see cref="User"/> whose role is Corporate. Until verified the client is
    /// <see cref="AccountStatus.Pending"/>. Billing details here drive the monthly
    /// company statement (GET /corporate/billing).
    /// </summary>
    public class CorporateProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }

        [MaxLength(150)] public string? CompanyName { get; set; }
        [MaxLength(64)] public string? TradeLicenseNumber { get; set; }

        // ---- Billing ----
        [MaxLength(160)] public string? BillingEmail { get; set; }
        [MaxLength(280)] public string? BillingAddress { get; set; }

        /// <summary>One of <see cref="VerificationStatus"/>.</summary>
        [MaxLength(20)] public string VerificationStatus { get; set; } = Models.VerificationStatus.Pending;

        /// <summary>Aggregate rating the client has received (owner/driver reviews).</summary>
        public double? Rating { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// An employee who may have rides booked under the company
    /// (role_wise_story.md §4). Optionally linked to an end-user account. Carries
    /// the per-employee spend control: a monthly cap and/or a "needs approval" flag.
    /// </summary>
    public class CorporateEmployee
    {
        public Guid Id { get; set; }
        public Guid CorporateId { get; set; }

        [MaxLength(120)] public string FullName { get; set; } = "";
        [MaxLength(160)] public string? Email { get; set; }
        [MaxLength(32)] public string? Phone { get; set; }

        /// <summary>Linked end-user account, when the employee email matches one.</summary>
        public Guid? UserId { get; set; }

        /// <summary>One of <see cref="CorporateEmployeeStatus"/> (active | suspended).</summary>
        [MaxLength(20)] public string Status { get; set; } = CorporateEmployeeStatus.Active;

        /// <summary>Monthly spend cap in minor units; null = no cap.</summary>
        public int? MonthlySpendLimitMinor { get; set; }

        /// <summary>When true, every booking for this employee needs admin approval.</summary>
        public bool RequiresApproval { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
