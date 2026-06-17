namespace BdCabs.Api.Models
{
    /// <summary>
    /// Role and status values are stored and transmitted as strings so the wire
    /// format matches the frontend's string unions exactly
    /// (packages/core/src/models/enums.ts) — e.g. "Customer", "active",
    /// "percentage". This avoids enum-casing mismatches across the boundary.
    /// </summary>
    public static class Roles
    {
        public const string Guest = "Guest";
        public const string Customer = "Customer";
        public const string Driver = "Driver";
        public const string FleetOwner = "FleetOwner";
        public const string Corporate = "Corporate";
        public const string SupportAdmin = "SupportAdmin";
        public const string FinanceAdmin = "FinanceAdmin";
        public const string SuperAdmin = "SuperAdmin";

        /// <summary>Roles a user may self-select at /auth/register.</summary>
        public static readonly string[] SelfRegisterable = { Customer, Driver, FleetOwner, Corporate };

        /// <summary>Staff roles — created by SuperAdmin, allowed into the admin panel.</summary>
        public static readonly string[] Staff = { SupportAdmin, FinanceAdmin, SuperAdmin };

        public static readonly string[] All =
        {
            Guest, Customer, Driver, FleetOwner, Corporate, SupportAdmin, FinanceAdmin, SuperAdmin,
        };

        public static bool IsValid(string? role) => role is not null && All.Contains(role);
    }

    public static class AccountStatus
    {
        public const string Active = "active";
        public const string Pending = "pending";
        public const string Suspended = "suspended";
        public const string Banned = "banned";

        public static readonly string[] All = { Active, Pending, Suspended, Banned };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class VerificationStatus
    {
        public const string Pending = "pending";
        public const string Approved = "approved";
        public const string Rejected = "rejected";
    }

    public static class CouponType
    {
        public const string Percentage = "percentage";
        public const string Flat = "flat";
        public const string FreeRide = "free-ride";

        public static readonly string[] All = { Percentage, Flat, FreeRide };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class CouponStatus
    {
        public const string Active = "active";
        public const string Paused = "paused";
        public const string Expired = "expired";

        public static readonly string[] All = { Active, Paused, Expired };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }
}
