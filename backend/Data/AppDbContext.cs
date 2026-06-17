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
        }
    }
}
