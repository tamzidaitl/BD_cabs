using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>User administration (API_ENDPOINTS.md §2). Staff-only.</summary>
    [ApiController]
    [Route("api/v1/users")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _users;

        public UsersController(IUserService users)
        {
            _users = users;
        }

        // GET /api/v1/users?page=1&pageSize=20&q=term
        [HttpGet]
        [Authorize(Roles = $"{Roles.SupportAdmin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<PagedResult<UserDto>>> List(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? q = null)
        {
            return Ok(await _users.List(page, pageSize, q));
        }

        [HttpGet("{id:guid}")]
        [Authorize(Roles = $"{Roles.SupportAdmin},{Roles.SuperAdmin}")]
        public async Task<ActionResult<UserDto>> Get(Guid id)
        {
            return Ok(await _users.GetById(id));
        }

        [HttpPatch("{id:guid}/status")]
        [Authorize(Roles = Roles.SuperAdmin)]
        public async Task<ActionResult<UserDto>> SetStatus(Guid id, [FromBody] UpdateStatusDto dto)
        {
            return Ok(await _users.SetStatus(id, dto.Status));
        }
    }
}
