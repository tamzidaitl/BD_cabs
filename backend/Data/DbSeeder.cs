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

            var now = DateTime.UtcNow;
            var adminEmail = (config["Seed:SuperAdminEmail"] ?? "admin@bdcabs.com").ToLowerInvariant();
            var adminPassword = config["Seed:SuperAdminPassword"] ?? "Admin123!";

            // One known dev account per role, each upserted independently so the set
            // stays complete even after a single account is added. Plaintext passwords
            // are documented in SEED_ACCOUNTS.md — local development only.
            await EnsureUserAsync(db, adminEmail, adminPassword, "Platform Super Admin",
                "+8800000000000", Roles.SuperAdmin, AccountStatus.Active, now);
            await EnsureUserAsync(db, "support@bdcabs.com", "Support123!", "Support Admin",
                "+8800000000001", Roles.SupportAdmin, AccountStatus.Active, now);
            await EnsureUserAsync(db, "customer1@bdcabs.com", "Customer123!", "Sample Customer",
                "+8801710000002", Roles.Customer, AccountStatus.Active, now);
            await EnsureUserAsync(db, "corporate1@bdcabs.com", "Corporate123!", "Sample Corporate Client",
                "+8801710000003", Roles.Corporate, AccountStatus.Pending, now);
            await EnsureUserAsync(db, "fleet1@bdcabs.com", "Fleet123!", "Sample Fleet Owner",
                "+8801710000004", Roles.FleetOwner, AccountStatus.Pending, now);

            // A fleet profile + a verified, rentable vehicle so the owner console and
            // the driver "vehicles for rent" list aren't empty on first run.
            var fleetOwner = await db.Users.FirstOrDefaultAsync(u => u.Email == "fleet1@bdcabs.com");
            if (fleetOwner is not null && !await db.FleetProfiles.AnyAsync(p => p.UserId == fleetOwner.Id))
            {
                db.FleetProfiles.Add(new FleetProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = fleetOwner.Id,
                    CompanyName = "Sample Fleet Ltd.",
                    TradeLicenseNumber = "TRAD-000123",
                    NidNumber = "1990123456789",
                    VerificationStatus = VerificationStatus.Pending,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                db.Vehicles.Add(new Vehicle
                {
                    Id = Guid.NewGuid(),
                    OwnerId = fleetOwner.Id,
                    Type = VehicleType.Car,
                    PlateNumber = "DHK-METRO-GA-1234",
                    Make = "Toyota",
                    Model = "Axio",
                    Color = "White",
                    Year = 2019,
                    Description = "Well-maintained 2019 Toyota Axio, AC, CNG-converted. Ideal for city ride-hailing.",
                    PhotoUrl = "https://picsum.photos/seed/axio/640/420",
                    PhotoUrls = new List<string> { "https://picsum.photos/seed/axio/640/420" },
                    VerificationStatus = VerificationStatus.Approved,
                    Status = VehicleStatus.Active,
                    IsActive = true,
                    ForRent = true,
                    RentalPriceMinor = 1500000, // ৳15,000 / period
                    RentalTerms = "Monthly rent, fuel and maintenance by driver.",
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                // A second vehicle left pending so the Vehicle Verification queue
                // isn't empty on first run — with documents for the reviewer to see.
                var pendingVehicleId = Guid.NewGuid();
                db.Vehicles.Add(new Vehicle
                {
                    Id = pendingVehicleId,
                    OwnerId = fleetOwner.Id,
                    Type = VehicleType.Premium,
                    PlateNumber = "DHK-METRO-KHA-5678",
                    Make = "Honda",
                    Model = "Grace",
                    Color = "Silver",
                    Year = 2021,
                    Description = "Premium 2021 Honda Grace hybrid. Leather seats, recently serviced. Awaiting platform verification.",
                    PhotoUrl = "https://picsum.photos/seed/grace/640/420",
                    PhotoUrls = new List<string>
                    {
                        "https://picsum.photos/seed/grace/640/420",
                        "https://picsum.photos/seed/grace2/640/420",
                    },
                    VerificationStatus = VerificationStatus.Pending,
                    Status = VehicleStatus.Inactive,
                    IsActive = false,
                    ForRent = false,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                db.VehicleDocuments.AddRange(
                    new VehicleDocument
                    {
                        Id = Guid.NewGuid(),
                        VehicleId = pendingVehicleId,
                        OwnerId = fleetOwner.Id,
                        Type = DocumentType.Registration,
                        DocumentUrl = "https://example.com/docs/grace-registration.pdf",
                        Number = "REG-5678-2021",
                        ExpiresAt = now.AddYears(2),
                        VerificationStatus = VerificationStatus.Pending,
                        CreatedAt = now,
                        UpdatedAt = now,
                    },
                    new VehicleDocument
                    {
                        Id = Guid.NewGuid(),
                        VehicleId = pendingVehicleId,
                        OwnerId = fleetOwner.Id,
                        Type = DocumentType.Insurance,
                        DocumentUrl = "https://example.com/docs/grace-insurance.pdf",
                        Number = "INS-5678",
                        ExpiresAt = now.AddMonths(8),
                        VerificationStatus = VerificationStatus.Pending,
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
            }

            // A pending driver (+ profile) so /ops/drivers/pending isn't empty.
            if (!await db.Users.AnyAsync(u => u.Email == "driver1@bdcabs.com"))
            {
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
            }

            if (!await db.Coupons.AnyAsync(c => c.Code == "WELCOME20"))
            {
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
            }

            // Sample rides so the Ops "Rides" console isn't empty on first run — an
            // active owner-driver with a verified car, plus a spread of trips across
            // statuses (and one with an SOS so the "problems" column is exercised).
            var customer = await db.Users.FirstOrDefaultAsync(u => u.Email == "customer1@bdcabs.com");
            if (customer is not null && !await db.Rides.AnyAsync())
            {
                // An active, approved driver who owns and drives their own car.
                var activeDriverId = Guid.NewGuid();
                var driverVehicleId = Guid.NewGuid();
                if (!await db.Users.AnyAsync(u => u.Email == "driver2@bdcabs.com"))
                {
                    db.Users.Add(new User
                    {
                        Id = activeDriverId,
                        FullName = "Karim Rahman",
                        Email = "driver2@bdcabs.com",
                        Phone = "+8801710000005",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Driver123!"),
                        Role = Roles.Driver,
                        Status = AccountStatus.Active,
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                    db.Vehicles.Add(new Vehicle
                    {
                        Id = driverVehicleId,
                        OwnerId = activeDriverId,
                        Type = VehicleType.Car,
                        PlateNumber = "DHK-METRO-GA-7788",
                        Make = "Toyota",
                        Model = "Premio",
                        Color = "Pearl White",
                        Year = 2020,
                        Description = "Owner-driven 2020 Toyota Premio.",
                        PhotoUrl = "https://picsum.photos/seed/premio/640/420",
                        PhotoUrls = new List<string> { "https://picsum.photos/seed/premio/640/420" },
                        VerificationStatus = VerificationStatus.Approved,
                        Status = VehicleStatus.Active,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                    db.DriverProfiles.Add(new DriverProfile
                    {
                        Id = Guid.NewGuid(),
                        UserId = activeDriverId,
                        VerificationStatus = VerificationStatus.Approved,
                        IsOnline = true,
                        AvailabilityMode = AvailabilityMode.Online,
                        Rating = 4.8,
                        LicenseNumber = "DL-DHK-7788",
                        ActiveVehicleId = driverVehicleId,
                        CurrentLat = 23.7806,
                        CurrentLng = 90.4143,
                        LocationUpdatedAt = now,
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                }

                // A trip in progress (Gulshan → Banani).
                var inProgressRideId = Guid.NewGuid();
                db.Rides.Add(new Ride
                {
                    Id = inProgressRideId,
                    CustomerId = customer.Id,
                    DriverId = activeDriverId,
                    VehicleId = driverVehicleId,
                    VehicleTypeId = VehicleType.Car,
                    Status = RideStatus.InProgress,
                    PickupLat = 23.7806, PickupLng = 90.4143, PickupAddress = "Gulshan 1, Dhaka",
                    DestLat = 23.7937, DestLng = 90.4066, DestAddress = "Banani, Dhaka",
                    DistanceMeters = 2600, DurationSeconds = 540,
                    Currency = "BDT", FareEstimateMinor = 18000,
                    PaymentMethod = PaymentMethodType.Cash,
                    StartOtp = "123456",
                    RequestedAt = now.AddMinutes(-20),
                    AcceptedAt = now.AddMinutes(-18),
                    ArrivedAt = now.AddMinutes(-14),
                    StartedAt = now.AddMinutes(-12),
                    CreatedAt = now.AddMinutes(-20), UpdatedAt = now.AddMinutes(-12),
                });

                // A completed trip (Dhanmondi → Motijheel).
                db.Rides.Add(new Ride
                {
                    Id = Guid.NewGuid(),
                    CustomerId = customer.Id,
                    DriverId = activeDriverId,
                    VehicleId = driverVehicleId,
                    VehicleTypeId = VehicleType.Car,
                    Status = RideStatus.Completed,
                    PickupLat = 23.7461, PickupLng = 90.3742, PickupAddress = "Dhanmondi 27, Dhaka",
                    DestLat = 23.7330, DestLng = 90.4172, DestAddress = "Motijheel, Dhaka",
                    DistanceMeters = 6200, DurationSeconds = 1320,
                    Currency = "BDT", FareEstimateMinor = 32000, FinalFareMinor = 32000,
                    PlatformCommissionMinor = 6400, DriverEarningsMinor = 25600,
                    PaymentMethod = PaymentMethodType.Bkash,
                    RequestedAt = now.AddHours(-3),
                    AcceptedAt = now.AddHours(-3).AddMinutes(2),
                    StartedAt = now.AddHours(-3).AddMinutes(6),
                    CompletedAt = now.AddHours(-2).AddMinutes(-20),
                    CreatedAt = now.AddHours(-3), UpdatedAt = now.AddHours(-2).AddMinutes(-20),
                });

                // A cancelled trip — appears as a problem in the Ops console.
                db.Rides.Add(new Ride
                {
                    Id = Guid.NewGuid(),
                    CustomerId = customer.Id,
                    DriverId = activeDriverId,
                    VehicleId = driverVehicleId,
                    VehicleTypeId = VehicleType.Car,
                    Status = RideStatus.Cancelled,
                    PickupLat = 23.8069, PickupLng = 90.3687, PickupAddress = "Mirpur 10, Dhaka",
                    DestLat = 23.8759, DestLng = 90.3795, DestAddress = "Uttara Sector 7, Dhaka",
                    DistanceMeters = 9100, DurationSeconds = 1800,
                    Currency = "BDT", FareEstimateMinor = 41000,
                    PaymentMethod = PaymentMethodType.Cash,
                    CancelledBy = RideParty.Customer,
                    CancelReason = "Driver took too long to arrive",
                    CancellationFeeMinor = 5000,
                    RequestedAt = now.AddHours(-5),
                    AcceptedAt = now.AddHours(-5).AddMinutes(3),
                    CancelledAt = now.AddHours(-5).AddMinutes(10),
                    CreatedAt = now.AddHours(-5), UpdatedAt = now.AddHours(-5).AddMinutes(10),
                });

                // An unfulfilled request — no driver found yet (also a problem).
                db.Rides.Add(new Ride
                {
                    Id = Guid.NewGuid(),
                    CustomerId = customer.Id,
                    VehicleTypeId = VehicleType.Premium,
                    Status = RideStatus.NoDriverFound,
                    PickupLat = 23.7104, PickupLng = 90.4074, PickupAddress = "Old Dhaka (Sadarghat)",
                    DestLat = 23.8513, DestLng = 90.4086, DestAddress = "Shahjalal Airport, Dhaka",
                    DistanceMeters = 15800, DurationSeconds = 2700,
                    Currency = "BDT", FareEstimateMinor = 72000,
                    PaymentMethod = PaymentMethodType.Card,
                    RequestedAt = now.AddMinutes(-40),
                    CreatedAt = now.AddMinutes(-40), UpdatedAt = now.AddMinutes(-38),
                });

                // An active SOS on the in-progress trip — the headline "problem".
                db.SafetyEvents.Add(new SafetyEvent
                {
                    Id = Guid.NewGuid(),
                    UserId = customer.Id,
                    RideId = inProgressRideId,
                    Kind = SafetyEventKind.Sos,
                    Lat = 23.7900, Lng = 90.4090,
                    Status = SafetyEventStatus.Active,
                    CreatedAt = now.AddMinutes(-5),
                });
            }

            await db.SaveChangesAsync();
        }

        /// <summary>Adds a user with the given dev password if no row with that email exists yet.</summary>
        private static async Task EnsureUserAsync(
            AppDbContext db,
            string email,
            string password,
            string fullName,
            string phone,
            string role,
            string status,
            DateTime now)
        {
            email = email.ToLowerInvariant();
            // Skip if either the email OR the phone is already taken — both are
            // unique columns, so inserting a duplicate of either would throw and
            // (when batched) abort the whole seed. Saving per-account keeps one
            // pre-existing/conflicting row from blocking the rest of the seed set.
            if (await db.Users.AnyAsync(u => u.Email == email || u.Phone == phone))
                return;

            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                FullName = fullName,
                Email = email,
                Phone = phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = role,
                Status = status,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await db.SaveChangesAsync();
        }
    }
}
