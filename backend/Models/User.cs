using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.Models
{
    /// <summary>
    /// The core account entity. One row per person/organization that can sign in,
    /// regardless of role. Role-specific data (driver docs, fleet KYC, etc.) hangs
    /// off this via separate tables as the system grows.
    /// </summary>
    public class User
    {
        public Guid Id { get; set; }

        [MaxLength(75)]
        public string FirstName { get; set; } = string.Empty;

        [MaxLength(75)]
        public string LastName { get; set; } = string.Empty;

        /// <summary>Display name, composed from first + last name on registration.</summary>
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        /// <summary>One of <see cref="Models.Gender"/> ("male" | "female" | "third-gender").</summary>
        [MaxLength(20)]
        public string? Gender { get; set; }

        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(32)]
        public string Phone { get; set; } = string.Empty;

        /// <summary>BCrypt hash — never serialized to clients (no DTO exposes it).</summary>
        public string PasswordHash { get; set; } = string.Empty;

        /// <summary>One of <see cref="Roles"/>.</summary>
        [MaxLength(32)]
        public string Role { get; set; } = Roles.Customer;

        /// <summary>One of <see cref="AccountStatus"/>.</summary>
        [MaxLength(32)]
        public string Status { get; set; } = AccountStatus.Active;

        [MaxLength(512)]
        public string? AvatarUrl { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
