using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Data
{
    /// <summary>
    /// Applies migrations and seeds a default SuperAdmin plus a few sample rows so
    /// the admin frontend has something to log into and render on first run.
    /// Credentials come from configuration (Seed:SuperAdmin*) with safe defaults.
    /// </summary>
    public static class DbSeeder
    {
        public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
        {
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await db.Database.MigrateAsync();

            var adminEmail = (config["Seed:SuperAdminEmail"] ?? "admin@bdcabs.com").ToLowerInvariant();
            var adminPassword = config["Seed:SuperAdminPassword"] ?? "Admin123!";

            if (!await db.Users.AnyAsync(u => u.Email == adminEmail))
            {
                var now = DateTime.UtcNow;
                db.Users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    FullName = "Platform Super Admin",
                    Email = adminEmail,
                    Phone = "+8800000000000",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                    Role = Roles.SuperAdmin,
                    Status = AccountStatus.Active,
                    CreatedAt = now,
                    UpdatedAt = now,
                });

                // A pending driver so /ops/drivers/pending isn't empty.
                var driverUserId = Guid.NewGuid();
                db.Users.Add(new User
                {
                    Id = driverUserId,
                    FullName = "Sample Pending Driver",
                    Email = "driver1@bdcabs.com",
                    Phone = "+8801710000001",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Driver123!"),
                    Role = Roles.Driver,
                    Status = AccountStatus.Pending,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                db.DriverProfiles.Add(new DriverProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = driverUserId,
                    VerificationStatus = VerificationStatus.Pending,
                    CreatedAt = now,
                    UpdatedAt = now,
                });

                db.Coupons.Add(new Coupon
                {
                    Id = Guid.NewGuid(),
                    Code = "WELCOME20",
                    Type = CouponType.Percentage,
                    Value = 20,
                    MaxDiscount = 10000,
                    MinFare = 5000,
                    ValidFrom = now,
                    ValidTo = now.AddMonths(1),
                    UsageLimitTotal = 10000,
                    UsageLimitPerUser = 1,
                    ApplicableRoles = new List<string> { Roles.Customer },
                    CostBorneBy = "platform",
                    FirstRideOnly = true,
                    Status = CouponStatus.Active,
                    CreatedAt = now,
                    UpdatedAt = now,
                });

                await db.SaveChangesAsync();
            }
        }
    }
}
