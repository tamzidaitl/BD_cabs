using System.Text.Json;

namespace BdCabs.Api.Common
{
    /// <summary>
    /// Catches anything that bubbles out of the pipeline and serializes it as the
    /// standard { error: { code, message, details } } envelope. Known domain
    /// failures (<see cref="AppException"/>) map to their status/code; everything
    /// else becomes a 500 with a generic message (no internal leakage).
    /// </summary>
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorHandlingMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ErrorHandlingMiddleware(
            RequestDelegate next,
            ILogger<ErrorHandlingMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (AppException ex)
            {
                await WriteError(context, ex.StatusCode, ex.Code, ex.Message, ex.Details);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception processing {Path}", context.Request.Path);
                var message = _env.IsDevelopment() ? ex.Message : "An unexpected error occurred.";
                await WriteError(context, 500, "INTERNAL_ERROR", message);
            }
        }

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        private static async Task WriteError(
            HttpContext context,
            int status,
            string code,
            string message,
            IEnumerable<string>? details = null)
        {
            if (context.Response.HasStarted) return;

            context.Response.Clear();
            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";

            var body = ApiError.Of(code, message, details);
            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
        }
    }
}
