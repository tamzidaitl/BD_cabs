using BdCabs.Api.Models;

namespace BdCabs.Api.Interfaces
{
    /// <summary>Issues signed JWT access tokens and opaque refresh tokens.</summary>
    public interface IJwtTokenService
    {
        /// <summary>Builds a signed access token for the user. Returns the JWT and its lifetime (seconds).</summary>
        (string token, int expiresInSeconds) CreateAccessToken(User user);

        /// <summary>Generates a cryptographically random refresh-token string.</summary>
        string CreateRefreshTokenValue();
    }
}
