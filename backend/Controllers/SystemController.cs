using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>System / utility endpoints (API_ENDPOINTS.md §14). Public.</summary>
    [ApiController]
    [Route("api/v1")]
    [AllowAnonymous]
    public class SystemController : ControllerBase
    {
        [HttpGet("health")]
        public IActionResult Health() => Ok(new { status = "ok", time = DateTime.UtcNow });

        [HttpGet("version")]
        public IActionResult Version() => Ok(new { name = "BdCabs.Api", version = "v1", framework = "net8.0" });
    }
}
