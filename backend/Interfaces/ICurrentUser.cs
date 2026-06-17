namespace BdCabs.Api.Interfaces
{
    /// <summary>
    /// Reads the authenticated principal from the current HTTP request. Lets the
    /// service layer ask "who is calling?" without touching HttpContext directly.
    /// </summary>
    public interface ICurrentUser
    {
        Guid? UserId { get; }
        string? Role { get; }
        bool IsAuthenticated { get; }
    }
}
