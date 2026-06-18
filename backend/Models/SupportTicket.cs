using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A support request — including fare disputes and complaints raised by a
    /// customer or driver (API_ENDPOINTS.md §12). Threaded messages are a future
    /// extension; this slice persists the ticket and its opening body.
    /// </summary>
    public class SupportTicket
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }

        /// <summary>One of <see cref="TicketCategory"/>.</summary>
        [MaxLength(20)] public string Category { get; set; } = TicketCategory.Other;

        [MaxLength(150)] public string Subject { get; set; } = string.Empty;
        [MaxLength(2000)] public string Body { get; set; } = string.Empty;

        /// <summary>Optional ride this ticket is about (e.g. a fare dispute).</summary>
        public Guid? RideId { get; set; }

        /// <summary>One of <see cref="TicketStatus"/>.</summary>
        [MaxLength(20)] public string Status { get; set; } = TicketStatus.Open;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
