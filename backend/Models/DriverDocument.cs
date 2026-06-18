using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// A personal document uploaded by a driver — license, NID, insurance, etc.
    /// (API_ENDPOINTS.md §3). Each upload is re-verified by Ops; renewing a document
    /// adds a new row and supersedes the old one for that type.
    /// </summary>
    public class DriverDocument
    {
        public Guid Id { get; set; }

        /// <summary>User id of the owning driver.</summary>
        public Guid DriverUserId { get; set; }

        /// <summary>One of <see cref="DocumentType"/>.</summary>
        [MaxLength(20)] public string Type { get; set; } = DocumentType.License;

        [MaxLength(512)] public string DocumentUrl { get; set; } = string.Empty;
        [MaxLength(64)] public string? Number { get; set; }
        public DateTime? ExpiresAt { get; set; }

        /// <summary>One of <see cref="VerificationStatus"/>.</summary>
        [MaxLength(20)] public string VerificationStatus { get; set; } = Models.VerificationStatus.Pending;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
