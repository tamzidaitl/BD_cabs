namespace BdCabs.Api.Configuration
{
    /// <summary>Bound from the "Jwt" section of appsettings.json.</summary>
    public class JwtOptions
    {
        public const string SectionName = "Jwt";

        public string Issuer { get; set; } = "BdCabs.Api";
        public string Audience { get; set; } = "BdCabs.Client";
        /// <summary>Symmetric signing key. Override in production via env/secret.</summary>
        public string Secret { get; set; } = string.Empty;
        /// <summary>Access-token lifetime in minutes.</summary>
        public int AccessTokenMinutes { get; set; } = 60;
        /// <summary>Refresh-token lifetime in days.</summary>
        public int RefreshTokenDays { get; set; } = 30;
    }
}
