using BdCabs.Api.Models;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Pricing + geo math for the ride flow. A real deployment loads these from
    /// the SuperAdmin pricing rules (API_ENDPOINTS.md §7); here they are sensible
    /// per-category constants so estimates, fares, and the fare-split are
    /// internally consistent. All money is minor units (poisha); distances metres.
    /// </summary>
    public static class FareCalculator
    {
        private const double EarthRadiusMeters = 6_371_000;
        private const double AverageSpeedKmh = 25;

        /// <summary>Platform's commission on the net fare (role_wise_story.md → Money Flow).</summary>
        public const double PlatformCommissionRate = 0.20;

        private record Tariff(int BaseMinor, int PerKmMinor, int PerMinMinor, int MinFareMinor);

        // Base / per-km / per-minute / minimum, in minor units (1 BDT = 100 poisha).
        private static readonly Dictionary<string, Tariff> Tariffs = new()
        {
            [VehicleType.Bike] = new(2000, 1500, 50, 3000),
            [VehicleType.Cng] = new(3000, 1800, 60, 4000),
            [VehicleType.Car] = new(5000, 2500, 100, 7000),
            [VehicleType.Premium] = new(10000, 4000, 150, 15000),
        };

        /// <summary>Great-circle distance between two points, in metres (haversine).</summary>
        public static int DistanceMeters(double lat1, double lng1, double lat2, double lng2)
        {
            double dLat = ToRad(lat2 - lat1);
            double dLng = ToRad(lng2 - lng1);
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                       Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return (int)Math.Round(EarthRadiusMeters * c);
        }

        public static int DurationSeconds(int distanceMeters)
        {
            double hours = (distanceMeters / 1000.0) / AverageSpeedKmh;
            return (int)Math.Round(hours * 3600);
        }

        /// <summary>Estimated fare (minor units), clamped to the category minimum.</summary>
        public static int EstimateFareMinor(string vehicleType, int distanceMeters, int durationSeconds)
        {
            var t = Tariffs.GetValueOrDefault(vehicleType, Tariffs[VehicleType.Car]);
            double km = distanceMeters / 1000.0;
            double minutes = durationSeconds / 60.0;
            int fare = t.BaseMinor + (int)Math.Round(km * t.PerKmMinor) + (int)Math.Round(minutes * t.PerMinMinor);
            return Math.Max(fare, t.MinFareMinor);
        }

        /// <summary>Itemised fare components (minor units) for a breakdown view.</summary>
        public static (int baseFare, int distanceFare, int timeFare, int total) Breakdown(
            string vehicleType, int distanceMeters, int durationSeconds)
        {
            var t = Tariffs.GetValueOrDefault(vehicleType, Tariffs[VehicleType.Car]);
            int baseFare = t.BaseMinor;
            int distanceFare = (int)Math.Round((distanceMeters / 1000.0) * t.PerKmMinor);
            int timeFare = (int)Math.Round((durationSeconds / 60.0) * t.PerMinMinor);
            int total = Math.Max(baseFare + distanceFare + timeFare, t.MinFareMinor);
            return (baseFare, distanceFare, timeFare, total);
        }

        /// <summary>
        /// Splits a net (post-discount) fare across platform, owner, and driver.
        /// For revenue-share rentals the owner takes <paramref name="ownerSharePct"/>
        /// of the fare; otherwise the owner cut is zero (owner-driver) and the driver
        /// keeps everything after commission.
        /// </summary>
        public static (int platform, int owner, int driver) Split(int netFareMinor, int? ownerSharePct = null)
        {
            int platform = (int)Math.Round(netFareMinor * PlatformCommissionRate);
            int owner = ownerSharePct is > 0 ? (int)Math.Round(netFareMinor * (ownerSharePct.Value / 100.0)) : 0;
            int driver = netFareMinor - platform - owner;
            if (driver < 0) driver = 0;
            return (platform, owner, driver);
        }

        private static double ToRad(double deg) => deg * Math.PI / 180.0;
    }
}
