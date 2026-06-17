using BdCabs.Api.Common;
using BdCabs.Api.Configuration;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Authentication business logic: signup, login, token refresh/rotation, and
    /// the /auth/me lookup. Produces the frontend-shaped <see cref="AuthSessionDto"/>
    /// (nested tokens) so the admin app's authStore can consume it directly.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _db;
        private readonly IJwtTokenService _jwt;
        private readonly ICurrentUser _currentUser;
        private readonly JwtOptions _jwtOptions;

        public AuthService(
            AppDbContext db,
            IJwtTokenService jwt,
            ICurrentUser currentUser,
            IOptions<JwtOptions> jwtOptions)
        {
            _db = db;
            _jwt = jwt;
            _currentUser = currentUser;
            _jwtOptions = jwtOptions.Value;
        }

        public async Task<AuthSessionDto> Register(RegisterDto dto)
        {
            // Staff roles are never self-registered (API_ENDPOINTS.md §1).
            if (!Roles.SelfRegisterable.Contains(dto.Role))
            {
                throw AppException.Forbidden(
                    "Only Customer, Driver, FleetOwner, or Corporate can self-register.",
                    "ROLE_NOT_SELF_REGISTERABLE");
            }

            var email = dto.Email.Trim().ToLowerInvariant();
            var phone = dto.Phone.Trim();

            if (await _db.Users.AnyAsync(u => u.Email == email))
                throw AppException.Conflict("Email already registered.", "EMAIL_TAKEN");
            if (await _db.Users.AnyAsync(u => u.Phone == phone))
                throw AppException.Conflict("Phone already registered.", "PHONE_TAKEN");

            // Customer is active immediately; Driver/FleetOwner/Corporate start pending.
            var status = dto.Role == Roles.Customer ? AccountStatus.Active : AccountStatus.Pending;

            var now = DateTime.UtcNow;
            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName.Trim(),
                Email = email,
                Phone = phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                Status = status,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _db.Users.Add(user);

            if (dto.Role == Roles.Driver)
            {
                _db.DriverProfiles.Add(new DriverProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    VerificationStatus = VerificationStatus.Pending,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            await _db.SaveChangesAsync();
            return await IssueSession(user);
        }

        public async Task<AuthSessionDto> Login(LoginDto dto)
        {
            var id = dto.EmailOrPhone.Trim();
            var emailLower = id.ToLowerInvariant();

            var user = await _db.Users.FirstOrDefaultAsync(
                u => u.Email == emailLower || u.Phone == id);

            if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw AppException.Unauthorized("Invalid credentials.", "INVALID_CREDENTIALS");

            if (user.Status is AccountStatus.Suspended or AccountStatus.Banned)
                throw AppException.Forbidden($"Account is {user.Status}.", "ACCOUNT_BLOCKED");

            return await IssueSession(user);
        }

        public async Task<AuthTokensDto> Refresh(string refreshToken)
        {
            var stored = await _db.RefreshTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Token == refreshToken);

            if (stored is null || !stored.IsActive || stored.User is null)
                throw AppException.Unauthorized("Invalid or expired refresh token.", "INVALID_REFRESH_TOKEN");

            // Rotate: revoke the presented token, issue a fresh pair.
            stored.RevokedAt = DateTime.UtcNow;
            var (tokens, _) = await BuildTokens(stored.User);
            await _db.SaveChangesAsync();
            return tokens;
        }

        public async Task Logout(string refreshToken)
        {
            var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken);
            if (stored is not null && stored.RevokedAt is null)
            {
                stored.RevokedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            // Idempotent: unknown/already-revoked tokens are a no-op.
        }

        public async Task<UserDto> GetCurrentUser()
        {
            var userId = _currentUser.UserId
                ?? throw AppException.Unauthorized("Not authenticated.");

            var user = await _db.Users.FindAsync(userId)
                ?? throw AppException.NotFound("User not found.");

            return ToUserDto(user);
        }

        public async Task ChangePassword(ChangePasswordDto dto)
        {
            var userId = _currentUser.UserId
                ?? throw AppException.Unauthorized("Not authenticated.");

            var user = await _db.Users.FindAsync(userId)
                ?? throw AppException.NotFound("User not found.");

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                throw AppException.BadRequest("Current password is incorrect.", "WRONG_PASSWORD");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // ---- helpers ----------------------------------------------------------

        private async Task<AuthSessionDto> IssueSession(User user)
        {
            var (tokens, _) = await BuildTokens(user);
            await _db.SaveChangesAsync();

            return new AuthSessionDto
            {
                UserId = user.Id,
                Role = user.Role,
                Status = user.Status,
                Tokens = tokens,
            };
        }

        /// <summary>Creates access + refresh tokens and queues the refresh token for persistence.</summary>
        private Task<(AuthTokensDto tokens, RefreshToken entity)> BuildTokens(User user)
        {
            var (access, expiresIn) = _jwt.CreateAccessToken(user);
            var refreshValue = _jwt.CreateRefreshTokenValue();

            var entity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = refreshValue,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
            };
            _db.RefreshTokens.Add(entity);

            var tokens = new AuthTokensDto
            {
                AccessToken = access,
                RefreshToken = refreshValue,
                ExpiresIn = expiresIn,
            };
            return Task.FromResult((tokens, entity));
        }

        private static UserDto ToUserDto(User u) => new()
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            Phone = u.Phone,
            Role = u.Role,
            Status = u.Status,
            AvatarUrl = u.AvatarUrl,
            CreatedAt = u.CreatedAt,
        };
    }
}
