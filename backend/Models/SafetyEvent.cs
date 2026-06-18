using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A safety/emergency event (API_ENDPOINTS.md §12): either an SOS alert raised
    /// during a ride, or a "share my trip" link sent to a trusted contact. Ops can
    /// see and resolve active events.
    /// </summary>
    public class SafetyEvent
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid? RideId { get; set; }

        /// <summary>One of <see cref="SafetyEventKind"/> (sos | trip-share).</summary>
        [MaxLength(20)] public string Kind { get; set; } = SafetyEventKind.Sos;

        public double? Lat { get; set; }
        public double? Lng { get; set; }

        /// <summary>For trip-share: the contact the trip was shared with.</summary>
        [MaxLength(120)] public string? ContactName { get; set; }
        [MaxLength(32)] public string? ContactPhone { get; set; }

        /// <summary>For trip-share: opaque public token used to view the live trip.</summary>
        [MaxLength(64)] public string? ShareToken { get; set; }

        /// <summary>One of <see cref="SafetyEventStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = SafetyEventStatus.Active;

        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
