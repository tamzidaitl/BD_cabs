using System.Text.Json;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using Microsoft.Extensions.Configuration;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Road routing backed by an OSRM server (the same engine that powers many
    /// Uber/Pathao-style distance quotes). Hits the <c>/route/v1/driving</c> endpoint
    /// and reads the trip distance + duration off the road network. The base URL is
    /// configurable via <c>Routing:OsrmBaseUrl</c>; it defaults to the public demo
    /// server, which is fine for dev but rate-limited — point it at a self-hosted
    /// OSRM/Valhalla (or a keyed provider) in production.
    /// </summary>
    public class OsrmRoutingService : IRoutingService
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        private readonly ILogger<OsrmRoutingService> _log;

        public OsrmRoutingService(HttpClient http, IConfiguration config, ILogger<OsrmRoutingService> log)
        {
            _http = http;
            _log = log;
            _baseUrl = (config["Routing:OsrmBaseUrl"] ?? "https://router.project-osrm.org").TrimEnd('/');
        }

        public async Task<(int distanceMeters, int durationSeconds)?> Route(
            double fromLat, double fromLng, double toLat, double toLng)
        {
            var path = await RoutePath(fromLat, fromLng, toLat, toLng);
            return path is null ? null : (path.DistanceMeters, path.DurationSeconds);
        }

        public async Task<RoutePathDto?> RoutePath(double fromLat, double fromLng, double toLat, double toLng)
        {
            // OSRM coordinate order is lng,lat. overview=full + geojson → full road geometry.
            var url = $"{_baseUrl}/route/v1/driving/{Coord(fromLng, fromLat)};{Coord(toLng, toLat)}" +
                      "?overview=full&geometries=geojson";
            try
            {
                using var resp = await _http.GetAsync(url);
                if (!resp.IsSuccessStatusCode) return null;

                await using var stream = await resp.Content.ReadAsStreamAsync();
                using var doc = await JsonDocument.ParseAsync(stream);
                var root = doc.RootElement;

                if (!root.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0)
                    return null;

                var route = routes[0];
                double distance = route.GetProperty("distance").GetDouble(); // metres
                double duration = route.GetProperty("duration").GetDouble(); // seconds

                var coordinates = new List<double[]>();
                if (route.TryGetProperty("geometry", out var geometry) &&
                    geometry.TryGetProperty("coordinates", out var coords))
                {
                    foreach (var point in coords.EnumerateArray())
                    {
                        // GeoJSON is [lng, lat]; emit [lat, lng] for Leaflet.
                        double lng = point[0].GetDouble();
                        double lat = point[1].GetDouble();
                        coordinates.Add(new[] { lat, lng });
                    }
                }

                return new RoutePathDto
                {
                    DistanceMeters = (int)Math.Round(distance),
                    DurationSeconds = (int)Math.Round(duration),
                    Coordinates = coordinates,
                };
            }
            catch (Exception ex)
            {
                // Never let a routing hiccup break the booking flow — fall back to straight-line.
                _log.LogWarning(ex, "OSRM routing failed; falling back to straight-line estimate");
                return null;
            }
        }

        private static string Coord(double lng, double lat)
        {
            var c = System.Globalization.CultureInfo.InvariantCulture;
            return $"{lng.ToString(c)},{lat.ToString(c)}";
        }
    }
}
