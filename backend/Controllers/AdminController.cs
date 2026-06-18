using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>
    /// Super-admin administration (API_ENDPOINTS.md §2). Whole controller is
    /// SuperAdmin-gated — e.g. minting internal staff accounts.
    /// </summary>
    [ApiController]
    [Route("api/v1/admin")]
    [Authorize(Roles = Roles.SuperAdmin)]
    public class AdminController : ControllerBase
    {
        private readonly IUserService _users;

        public AdminController(IUserService users)
        {
            _users = users;
        }

        // POST /api/v1/admin/staff — create a SupportAdmin / FinanceAdmin.
        [HttpPost("staff")]
        public async Task<ActionResult<UserDto>> CreateStaff([FromBody] CreateStaffDto dto)
        {
            var created = await _users.CreateStaff(dto);
            return Created($"/api/v1/users/{created.Id}", created);
        }
    }
}
