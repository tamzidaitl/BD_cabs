using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>
    /// Authentication & account endpoints (API_ENDPOINTS.md §1).
    /// Responses are returned raw (no envelope) because the frontend ApiClient
    /// deserializes the body directly into the typed result.
    /// </summary>
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;
        private readonly IWebHostEnvironment _env;

        // Avatar uploads: cap size and restrict to common image types.
        private const long MaxAvatarBytes = 5 * 1024 * 1024;
        private static readonly Dictionary<string, string> AllowedImageTypes = new()
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif",
        };

        public AuthController(IAuthService auth, IWebHostEnvironment env)
        {
            _auth = auth;
            _env = env;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthSessionDto>> Register([FromBody] RegisterDto dto)
        {
            var session = await _auth.Register(dto);
            return StatusCode(StatusCodes.Status201Created, session);
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthSessionDto>> Login([FromBody] LoginDto dto)
        {
            return Ok(await _auth.Login(dto));
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthTokensDto>> Refresh([FromBody] RefreshDto dto)
        {
            return Ok(await _auth.Refresh(dto.RefreshToken));
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] RefreshDto dto)
        {
            await _auth.Logout(dto.RefreshToken);
            return NoContent();
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserDto>> Me()
        {
            return Ok(await _auth.GetCurrentUser());
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            await _auth.ChangePassword(dto);
            return NoContent();
        }

        [HttpPut("me")]
        [Authorize]
        public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            return Ok(await _auth.UpdateProfile(dto));
        }

        /// <summary>Upload a new profile photo (multipart/form-data field "file").</summary>
        [HttpPost("me/avatar")]
        [Authorize]
        public async Task<ActionResult<UserDto>> UploadAvatar(IFormFile? file)
        {
            if (file is null || file.Length == 0)
                throw AppException.BadRequest("No file was uploaded.", "NO_FILE");
            if (file.Length > MaxAvatarBytes)
                throw AppException.BadRequest("Image must be 5 MB or smaller.", "FILE_TOO_LARGE");
            if (!AllowedImageTypes.TryGetValue(file.ContentType, out var ext))
                throw AppException.BadRequest("Only JPEG, PNG, WebP or GIF images are allowed.", "UNSUPPORTED_IMAGE_TYPE");

            // Persist under {ContentRoot}/uploads/avatars and serve via /uploads (see Program.cs).
            var dir = Path.Combine(_env.ContentRootPath, "uploads", "avatars");
            Directory.CreateDirectory(dir);
            var fileName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            // Absolute URL so the frontend <img> resolves against the API, not its own origin.
            var url = $"{Request.Scheme}://{Request.Host}/uploads/avatars/{fileName}";
            return Ok(await _auth.UpdateProfile(new UpdateProfileDto { AvatarUrl = url }));
        }
    }
}
