using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    /// <summary>
    /// Public user shape. Matches the frontend `User` interface
    /// (packages/core/src/models/entities.ts). PasswordHash is intentionally absent.
    /// </summary>
    public class UserDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateProfileDto
    {
        [MaxLength(150)]
        public string? FullName { get; set; }

        [EmailAddress, MaxLength(256)]
        public string? Email { get; set; }

        [MaxLength(512)]
        public string? AvatarUrl { get; set; }
    }

    /// <summary>Body for PATCH /users/{id}/status — mirrors endpoints.ts setStatus.</summary>
    public class UpdateStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }
}
