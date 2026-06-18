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
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Gender { get; set; }
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

    /// <summary>
    /// Body for the Ops verification endpoints (driver / vehicle). Status is one of
    /// VerificationStatus — "approved" or "rejected".
    /// </summary>
    public class VerificationDecisionDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;

        /// <summary>Optional reviewer note (e.g. reason for rejection).</summary>
        [MaxLength(280)]
        public string? Note { get; set; }
    }

    /// <summary>
    /// Body for POST /admin/staff (SuperAdmin only). Creates a SupportAdmin or
    /// FinanceAdmin — staff roles that cannot self-register (API_ENDPOINTS.md §2).
    /// </summary>
    public class CreateStaffDto
    {
        [Required, MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, Phone, MaxLength(32)]
        public string Phone { get; set; } = string.Empty;

        [Required, MinLength(8), MaxLength(128)]
        public string Password { get; set; } = string.Empty;

        /// <summary>"SupportAdmin" or "FinanceAdmin".</summary>
        [Required]
        public string Role { get; set; } = string.Empty;
    }
}
