namespace BdCabs.Api.Models
{
    /// <summary>
    /// A persisted refresh token. Storing them lets us revoke on logout and rotate
    /// on every /auth/refresh (the old one is marked revoked, a new one issued).
    /// </summary>
    public class RefreshToken
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RevokedAt { get; set; }

        public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
    }
}
