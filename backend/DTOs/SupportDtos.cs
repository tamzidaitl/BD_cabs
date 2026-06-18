using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    public class SupportTicketDto
    {
        public Guid Id { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public Guid? RideId { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class SupportTicketCreateDto
    {
        /// <summary>One of TicketCategory (complaint, fare-dispute, other).</summary>
        public string Category { get; set; } = "other";
        [Required, MaxLength(150)] public string Subject { get; set; } = string.Empty;
        [Required, MaxLength(2000)] public string Body { get; set; } = string.Empty;
        public Guid? RideId { get; set; }
    }

    // ---- Safety ----

    public class SafetyEventDto
    {
        public Guid Id { get; set; }
        public string Kind { get; set; } = string.Empty;
        public Guid? RideId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ShareToken { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SosDto
    {
        public Guid? RideId { get; set; }
        public double? Lat { get; set; }
        public double? Lng { get; set; }
    }

    public class ShareTripDto
    {
        [Required] public Guid RideId { get; set; }
        [Required, MaxLength(120)] public string ContactName { get; set; } = string.Empty;
        [Required, MaxLength(32)] public string ContactPhone { get; set; } = string.Empty;
    }
}
