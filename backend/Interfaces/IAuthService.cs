using BdCabs.Api.DTOs;

namespace BdCabs.Api.Interfaces
{
    public interface IAuthService
    {
        Task<AuthSessionDto> Register(RegisterDto dto);
        Task<AuthSessionDto> Login(LoginDto dto);
        Task<AuthTokensDto> Refresh(string refreshToken);
        Task Logout(string refreshToken);
        Task<UserDto> GetCurrentUser();
        Task ChangePassword(ChangePasswordDto dto);
    }
}
