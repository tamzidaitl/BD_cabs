namespace BdCabs.Api.Common
{
    /// <summary>
    /// The error envelope every failed request returns, matching the frontend
    /// contract in API_ENDPOINTS.md:  { "error": { "code", "message", "details" } }.
    /// The web ApiClient (packages/core/src/api/client.ts) reads exactly this shape,
    /// so the property names here are part of the public API surface.
    /// </summary>
    public class ApiError
    {
        public ApiErrorBody Error { get; set; } = new();

        public static ApiError Of(string code, string message, IEnumerable<string>? details = null) =>
            new()
            {
                Error = new ApiErrorBody
                {
                    Code = code,
                    Message = message,
                    Details = details?.ToList(),
                },
            };
    }

    public class ApiErrorBody
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public List<string>? Details { get; set; }
    }
}
