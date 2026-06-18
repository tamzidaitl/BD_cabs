using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>Support tickets — complaints &amp; fare disputes (API_ENDPOINTS.md §12).</summary>
    [ApiController]
    [Route("api/v1/support")]
    [Authorize]
    public class SupportController : ControllerBase
    {
        private readonly ISupportService _support;
        private readonly ICurrentUser _me;

        public SupportController(ISupportService support, ICurrentUser me)
        {
            _support = support;
            _me = me;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");
        private string Role => _me.Role ?? Roles.Guest;

        [HttpPost("tickets")]
        public async Task<ActionResult<SupportTicketDto>> Create([FromBody] SupportTicketCreateDto dto)
        {
            var ticket = await _support.Create(Uid, dto);
            return StatusCode(StatusCodes.Status201Created, ticket);
        }

        [HttpGet("tickets/me")]
        public async Task<ActionResult<List<SupportTicketDto>>> Mine() => Ok(await _support.ListMine(Uid));

        [HttpGet("tickets/{id:guid}")]
        public async Task<ActionResult<SupportTicketDto>> Get(Guid id) => Ok(await _support.Get(Uid, Role, id));
    }
}
