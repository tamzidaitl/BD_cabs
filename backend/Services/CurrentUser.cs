using System.Security.Claims;
using BdCabs.Api.Interfaces;

namespace BdCabs.Api.Services
{
    public class CurrentUser : ICurrentUser
    {
        private readonly IHttpContextAccessor _accessor;

        public CurrentUser(IHttpContextAccessor accessor)
        {
            _accessor = accessor;
        }

        private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

        public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

        public Guid? UserId
        {
            get
            {
                var raw = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                return Guid.TryParse(raw, out var id) ? id : null;
            }
        }

        public string? Role => Principal?.FindFirstValue(ClaimTypes.Role);
    }
}
