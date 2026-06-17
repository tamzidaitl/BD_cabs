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

        public AuthController(IAuthService auth)
        {
            _auth = auth;
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
    }
}
