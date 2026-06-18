using System.ComponentModel.DataAnnotations;

namespace BdCabs.Api.DTOs
{
    // ---- Inputs ---------------------------------------------------------------

    public class RegisterDto
    {
        [Required, MaxLength(75)]
        public string FirstName { get; set; } = string.Empty;

        [Required, MaxLength(75)]
        public string LastName { get; set; } = string.Empty;

        /// <summary>"male" | "female" | "third-gender" (validated in the service).</summary>
        [Required]
        public string Gender { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MaxLength(32)]
        public string Phone { get; set; } = string.Empty;

        [Required, MinLength(6), MaxLength(128)]
        public string Password { get; set; } = string.Empty;

        /// <summary>Customer | Driver | FleetOwner | Corporate (validated in the service).</summary>
        [Required]
        public string Role { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        /// <summary>Email or phone — matches the frontend `emailOrPhone` field.</summary>
        [Required]
        public string EmailOrPhone { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class RefreshDto
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required, MinLength(6), MaxLength(128)]
        public string NewPassword { get; set; } = string.Empty;
    }

    // ---- Outputs --------------------------------------------------------------

    /// <summary>
    /// Token bundle. Matches the frontend `AuthTokens` interface
    /// (packages/core/src/models/entities.ts) and is what /auth/refresh returns.
    /// </summary>
    public class AuthTokensDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        /// <summary>Access-token lifetime in seconds.</summary>
        public int ExpiresIn { get; set; }
    }

    /// <summary>
    /// Login/register result. Matches the frontend `AuthSession` interface —
    /// note the NESTED `tokens` object (not flattened). The admin app's
    /// authStore reads session.tokens.accessToken directly.
    /// </summary>
    public class AuthSessionDto
    {
        public Guid UserId { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public AuthTokensDto Tokens { get; set; } = new();
    }
}
