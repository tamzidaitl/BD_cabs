using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Data
{
    /// <summary>
    /// EF Core session for the BD Cabs database (PostgreSQL via Npgsql).
    /// Each DbSet maps to a table. This slice covers the entities the admin
    /// frontend touches; new resources are added here as features land.
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<DriverProfile> DriverProfiles => Set<DriverProfile>();
        public DbSet<Coupon> Coupons => Set<Coupon>();

        // ---- Customer & Driver flows ----
        public DbSet<Ride> Rides => Set<Ride>();
        public DbSet<RecurringRide> RecurringRides => Set<RecurringRide>();
        public DbSet<SavedPlace> SavedPlaces => Set<SavedPlace>();
        public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<Wallet> Wallets => Set<Wallet>();
        public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
        public DbSet<SafetyEvent> SafetyEvents => Set<SafetyEvent>();
        public DbSet<CouponRedemption> CouponRedemptions => Set<CouponRedemption>();
        public DbSet<Vehicle> Vehicles => Set<Vehicle>();
        public DbSet<RentalAgreement> RentalAgreements => Set<RentalAgreement>();
        public DbSet<RentPayment> RentPayments => Set<RentPayment>();
        public DbSet<DriverDocument> DriverDocuments => Set<DriverDocument>();

        // ---- Fleet / Vehicle Owner flows ----
        public DbSet<VehicleDocument> VehicleDocuments => Set<VehicleDocument>();
        public DbSet<FleetProfile> FleetProfiles => Set<FleetProfile>();
        public DbSet<FleetDriver> FleetDrivers => Set<FleetDriver>();

        // ---- Corporate Client flows ----
        public DbSet<CorporateProfile> CorporateProfiles => Set<CorporateProfile>();
        public DbSet<CorporateEmployee> CorporateEmployees => Set<CorporateEmployee>();
        public DbSet<CorporateBooking> CorporateBookings => Set<CorporateBooking>();
        public DbSet<CorporateRecurringRide> CorporateRecurringRides => Set<CorporateRecurringRide>();
        public DbSet<CorporateRentalContract> CorporateRentalContracts => Set<CorporateRentalContract>();
        public DbSet<CorporateRentalDriver> CorporateRentalDrivers => Set<CorporateRentalDriver>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(e =>
            {
                e.HasIndex(u => u.Email).IsUnique();
                e.HasIndex(u => u.Phone).IsUnique();
                e.HasMany(u => u.RefreshTokens)
                    .WithOne(t => t.User!)
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<RefreshToken>(e =>
            {
                e.HasIndex(t => t.Token);
            });

            modelBuilder.Entity<DriverProfile>(e =>
            {
                e.HasIndex(d => d.UserId).IsUnique();
                e.HasOne(d => d.User)
                    .WithOne()
                    .HasForeignKey<DriverProfile>(d => d.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Coupon>(e =>
            {
                e.HasIndex(c => c.Code).IsUnique();
                // Npgsql maps List<Guid>/List<string> to native PostgreSQL arrays
                // (uuid[] / text[]) — no extra configuration needed.
            });

            // ---- Customer & Driver flows -----------------------------------
            modelBuilder.Entity<Ride>(e =>
            {
                e.HasIndex(r => r.CustomerId);
                e.HasIndex(r => r.DriverId);
                e.HasIndex(r => r.Status);
            });

            modelBuilder.Entity<RecurringRide>(e =>
            {
                e.HasIndex(r => r.CustomerId);
                // DaysOfWeek (List<int>) maps to a native int[] column via Npgsql.
            });

            modelBuilder.Entity<SavedPlace>(e => e.HasIndex(p => p.UserId));

            modelBuilder.Entity<PaymentMethod>(e => e.HasIndex(p => p.UserId));
            modelBuilder.Entity<Payment>(e =>
            {
                e.HasIndex(p => p.CustomerId);
                e.HasIndex(p => p.RideId);
            });

            modelBuilder.Entity<Wallet>(e => e.HasIndex(w => w.UserId).IsUnique());
            modelBuilder.Entity<WalletTransaction>(e => e.HasIndex(t => t.WalletId));

            modelBuilder.Entity<Review>(e =>
            {
                e.HasIndex(r => r.RevieweeId);
                // One review per (ride, reviewer, target) — no double-rating. Rental
                // reviews leave RideId null; Postgres treats NULLs as distinct, so this
                // only constrains ride-based reviews.
                e.HasIndex(r => new { r.RideId, r.ReviewerId, r.RevieweeType }).IsUnique();
                // The rental-review counterpart: one per (agreement, reviewer, target).
                e.HasIndex(r => new { r.RentalAgreementId, r.ReviewerId, r.RevieweeType }).IsUnique();
                // Moderation queue filters by status.
                e.HasIndex(r => r.Status);
            });

            modelBuilder.Entity<SupportTicket>(e => e.HasIndex(t => t.UserId));
            modelBuilder.Entity<SafetyEvent>(e => e.HasIndex(s => s.UserId));

            modelBuilder.Entity<CouponRedemption>(e =>
            {
                e.HasIndex(r => new { r.CouponId, r.UserId });
                e.HasIndex(r => r.RideId);
            });

            modelBuilder.Entity<Vehicle>(e =>
            {
                e.HasIndex(v => v.OwnerId);
                e.HasIndex(v => v.ForRent);
            });

            modelBuilder.Entity<RentalAgreement>(e =>
            {
                e.HasIndex(a => a.DriverId);
                e.HasIndex(a => a.OwnerId);
                e.HasIndex(a => a.VehicleId);
            });
            modelBuilder.Entity<RentPayment>(e => e.HasIndex(p => p.RentalAgreementId));

            modelBuilder.Entity<DriverDocument>(e => e.HasIndex(d => d.DriverUserId));

            // ---- Fleet / Vehicle Owner flows -------------------------------
            modelBuilder.Entity<VehicleDocument>(e =>
            {
                e.HasIndex(d => d.VehicleId);
                e.HasIndex(d => d.OwnerId);
            });

            modelBuilder.Entity<FleetProfile>(e =>
            {
                e.HasIndex(p => p.UserId).IsUnique();
                e.HasOne(p => p.User)
                    .WithOne()
                    .HasForeignKey<FleetProfile>(p => p.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FleetDriver>(e =>
            {
                e.HasIndex(f => f.OwnerId);
                // One membership row per (owner, driver) pair.
                e.HasIndex(f => new { f.OwnerId, f.DriverId }).IsUnique();
            });

            // ---- Corporate Client flows ------------------------------------
            modelBuilder.Entity<CorporateProfile>(e =>
            {
                e.HasIndex(p => p.UserId).IsUnique();
                e.HasOne(p => p.User)
                    .WithOne()
                    .HasForeignKey<CorporateProfile>(p => p.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CorporateEmployee>(e => e.HasIndex(c => c.CorporateId));

            modelBuilder.Entity<CorporateBooking>(e =>
            {
                e.HasIndex(b => b.CorporateId);
                e.HasIndex(b => b.EmployeeId);
                e.HasIndex(b => b.Status);
            });

            modelBuilder.Entity<CorporateRecurringRide>(e =>
            {
                e.HasIndex(r => r.CorporateId);
                // DaysOfWeek (List<int>) maps to a native int[] column via Npgsql.
            });

            modelBuilder.Entity<CorporateRentalContract>(e =>
            {
                e.HasIndex(c => c.CorporateId);
                e.HasIndex(c => c.OwnerId);
                e.HasIndex(c => c.VehicleId);
                e.HasIndex(c => c.Status);
            });

            modelBuilder.Entity<CorporateRentalDriver>(e =>
            {
                e.HasIndex(d => d.ContractId);
                e.HasIndex(d => d.OwnerId);
                e.HasIndex(d => d.DriverId);
            });
        }
    }
}
