namespace BdCabs.Api.Models
{
    /// <summary>
    /// String-valued domain enums for the Customer &amp; Driver flows. Like
    /// <see cref="Roles"/> these are stored/transmitted as strings so the wire
    /// format matches the frontend unions in packages/core/src/models/enums.ts
    /// exactly (no enum-casing drift across the boundary).
    /// </summary>
    public static class RideStatus
    {
        public const string Requested = "Requested";
        public const string Scheduled = "Scheduled";       // booked in advance / from a recurring schedule
        public const string Accepted = "Accepted";
        public const string DriverArrived = "DriverArrived";
        public const string InProgress = "InProgress";
        public const string Completed = "Completed";
        public const string Cancelled = "Cancelled";
        public const string NoDriverFound = "NoDriverFound";

        public static readonly string[] All =
        {
            Requested, Scheduled, Accepted, DriverArrived, InProgress, Completed, Cancelled, NoDriverFound,
        };

        /// <summary>States from which a customer/driver may still cancel.</summary>
        public static readonly string[] Cancellable = { Requested, Scheduled, Accepted, DriverArrived };
    }

    public static class RideParty
    {
        public const string Customer = "Customer";
        public const string Driver = "Driver";
        public const string System = "System";
    }

    public static class PaymentMethodType
    {
        public const string Cash = "Cash";
        public const string Card = "Card";
        public const string Bkash = "bKash";
        public const string Nagad = "Nagad";
        public const string Wallet = "Wallet";

        public static readonly string[] All = { Cash, Card, Bkash, Nagad, Wallet };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class PaymentStatus
    {
        public const string Pending = "Pending";
        public const string Paid = "Paid";
        public const string Failed = "Failed";
        public const string Refunded = "Refunded";
    }

    public static class WalletTxnType
    {
        public const string Topup = "Topup";
        public const string RidePayment = "RidePayment";
        public const string Payout = "Payout";
        public const string Refund = "Refund";
        public const string RentPayment = "RentPayment";
        public const string Adjustment = "Adjustment";
    }

    /// <summary>Who/what a review is about — a ride yields up to one per direction.</summary>
    public static class ReviewTargetType
    {
        public const string Driver = "Driver";
        public const string Customer = "Customer";
        public const string Owner = "Owner";
        /// <summary>A rented Vehicle, rated by a rental Driver after the agreement ends.</summary>
        public const string Vehicle = "Vehicle";
        /// <summary>A Corporate Client, rated by a Vehicle Owner after a rental contract.</summary>
        public const string Corporate = "Corporate";

        public static readonly string[] All = { Driver, Customer, Owner, Vehicle, Corporate };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>
    /// Moderation state of a review (Super Admin / Support Admin review moderation).
    /// <see cref="Hidden"/> and <see cref="Removed"/> reviews are excluded from
    /// public listings and from rating averages; Hidden is reversible, Removed is a
    /// soft-delete kept for audit. New reviews start <see cref="Visible"/>.
    /// </summary>
    public static class ReviewStatus
    {
        public const string Visible = "Visible";
        public const string Hidden = "Hidden";
        public const string Removed = "Removed";

        public static readonly string[] All = { Visible, Hidden, Removed };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);

        /// <summary>States hidden from the public / excluded from rating averages.</summary>
        public static readonly string[] Moderated = { Hidden, Removed };
    }

    /// <summary>The action a moderator takes on a review.</summary>
    public static class ReviewModerationAction
    {
        public const string Hide = "hide";
        public const string Unhide = "unhide";
        public const string Remove = "remove";

        public static readonly string[] All = { Hide, Unhide, Remove };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class RentalStatus
    {
        public const string Requested = "Requested";
        public const string Approved = "Approved";
        public const string Rejected = "Rejected";
        public const string Active = "Active";
        public const string Ended = "Ended";
    }

    public static class RentType
    {
        public const string Fixed = "fixed";
        public const string RevenueShare = "revenue-share";

        public static readonly string[] All = { Fixed, RevenueShare };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>Billing cadence an owner advertises a rental vehicle at.</summary>
    public static class RentalPeriod
    {
        public const string Daily = "daily";
        public const string Weekly = "weekly";
        public const string Monthly = "monthly";

        public static readonly string[] All = { Daily, Weekly, Monthly };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>
    /// Lifecycle of a corporate rental contract (Corporate ↔ Vehicle Owner). The
    /// corporate requests a rentable vehicle (<see cref="Requested"/>); the owner
    /// sets terms and approves (<see cref="Approved"/>), assigns drivers and starts
    /// the service period (<see cref="Active"/>), then completes it
    /// (<see cref="Completed"/>) — which unlocks the two-way review. Owner rejection
    /// or cancellation by either side closes it.
    /// </summary>
    public static class CorporateRentalStatus
    {
        public const string Requested = "Requested";
        public const string Approved = "Approved";
        public const string Active = "Active";
        public const string Completed = "Completed";
        public const string Rejected = "Rejected";
        public const string Cancelled = "Cancelled";

        public static readonly string[] All =
        {
            Requested, Approved, Active, Completed, Rejected, Cancelled,
        };

        /// <summary>States either party may still cancel from.</summary>
        public static readonly string[] Cancellable = { Requested, Approved, Active };

        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>State of a driver's assignment to a corporate rental contract.</summary>
    public static class CorporateRentalDriverStatus
    {
        public const string Assigned = "assigned";
        public const string Unassigned = "unassigned";

        public static readonly string[] All = { Assigned, Unassigned };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class TicketCategory
    {
        public const string Complaint = "complaint";
        public const string FareDispute = "fare-dispute";
        public const string Other = "other";

        public static readonly string[] All = { Complaint, FareDispute, Other };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class TicketStatus
    {
        public const string Open = "open";
        public const string Pending = "pending";
        public const string Resolved = "resolved";
        public const string Closed = "closed";
    }

    /// <summary>Kind of safety event — emergency alert vs. live-trip share.</summary>
    public static class SafetyEventKind
    {
        public const string Sos = "sos";
        public const string TripShare = "trip-share";

        public static readonly string[] All = { Sos, TripShare };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    public static class SafetyEventStatus
    {
        public const string Active = "active";
        public const string Resolved = "resolved";
    }

    public static class CouponRedemptionStatus
    {
        /// <summary>Counted against the user's quota (ride completed with the coupon).</summary>
        public const string Locked = "locked";
        /// <summary>Released back to the quota (ride cancelled/refunded).</summary>
        public const string Released = "released";
    }

    public static class DocumentType
    {
        public const string License = "license";
        public const string Nid = "nid";
        public const string Insurance = "insurance";
        public const string Fitness = "fitness";
        public const string Registration = "registration";
        public const string Other = "other";

        public static readonly string[] All = { License, Nid, Insurance, Fitness, Registration, Other };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>Operational state of a vehicle, set by its Fleet/Vehicle Owner.</summary>
    public static class VehicleStatus
    {
        public const string Active = "active";
        public const string Inactive = "inactive";
        public const string Maintenance = "maintenance";

        public static readonly string[] All = { Active, Inactive, Maintenance };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>Membership state of a driver within an owner's fleet.</summary>
    public static class FleetDriverStatus
    {
        public const string Active = "active";
        public const string Removed = "removed";

        public static readonly string[] All = { Active, Removed };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>Ride categories (mirrors the public /vehicle-types list).</summary>
    public static class VehicleType
    {
        public const string Bike = "Bike";
        public const string Car = "Car";
        public const string Premium = "Premium";
        public const string Cng = "CNG";

        public static readonly string[] All = { Bike, Car, Premium, Cng };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>
    /// How a corporate booking is allocated a vehicle (role_wise_story.md §4):
    /// the platform auto-allocates any available vehicle, or the corporate routes
    /// the ride to a specific preferred Fleet/Vehicle Owner.
    /// </summary>
    public static class RideAllocationMode
    {
        public const string Auto = "auto";
        public const string Fleet = "fleet";

        public static readonly string[] All = { Auto, Fleet };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>Membership state of an employee under a corporate account.</summary>
    public static class CorporateEmployeeStatus
    {
        public const string Active = "active";
        public const string Suspended = "suspended";

        public static readonly string[] All = { Active, Suspended };
        public static bool IsValid(string? s) => s is not null && All.Contains(s);
    }

    /// <summary>
    /// Lifecycle of a corporate booking. Bookings that hit an employee's approval
    /// rule or spend limit start <see cref="PendingApproval"/>; once cleared they
    /// are <see cref="Approved"/> (or <see cref="Scheduled"/> for advance bookings),
    /// then <see cref="Completed"/> — which is what billing and reports count.
    /// </summary>
    public static class CorporateBookingStatus
    {
        public const string PendingApproval = "PendingApproval";
        public const string Approved = "Approved";
        public const string Scheduled = "Scheduled";
        public const string Completed = "Completed";
        public const string Rejected = "Rejected";
        public const string Cancelled = "Cancelled";

        public static readonly string[] All =
        {
            PendingApproval, Approved, Scheduled, Completed, Rejected, Cancelled,
        };

        /// <summary>States a corporate admin may still cancel from.</summary>
        public static readonly string[] Cancellable = { PendingApproval, Approved, Scheduled };
    }
}
