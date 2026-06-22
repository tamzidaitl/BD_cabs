using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    /// <summary>Road distance/time between two points, the way Uber/Pathao quote a trip.</summary>
    public interface IRoutingService
    {
        /// <summary>
        /// Returns the driving-route distance (metres) and duration (seconds) along
        /// the road network between two coordinates, or <c>null</c> if no route could
        /// be obtained (offline, provider error). Callers fall back to a straight-line
        /// estimate so a quote is always produced.
        /// </summary>
        Task<(int distanceMeters, int durationSeconds)?> Route(
            double fromLat, double fromLng, double toLat, double toLng);

        /// <summary>
        /// Like <see cref="Route"/> but also returns the route geometry (the ordered
        /// road-following points a map draws). Returns <c>null</c> when no route is
        /// available; callers then draw a straight line. This backs the client route
        /// proxy so the frontend never calls the routing provider directly.
        /// </summary>
        Task<RoutePathDto?> RoutePath(double fromLat, double fromLng, double toLat, double toLng);
    }
}
