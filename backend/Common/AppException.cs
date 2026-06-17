namespace BdCabs.Api.Common
{
    /// <summary>
    /// Domain-level exception carrying an HTTP status + a stable machine code.
    /// Thrown by the service layer; translated into the { error: {...} } envelope
    /// by <see cref="ErrorHandlingMiddleware"/>. Using a typed exception keeps the
    /// services free of ASP.NET types (controllers/middleware own the HTTP shape).
    /// </summary>
    public class AppException : Exception
    {
        public int StatusCode { get; }
        public string Code { get; }
        public IReadOnlyList<string>? Details { get; }

        public AppException(int statusCode, string code, string message, IReadOnlyList<string>? details = null)
            : base(message)
        {
            StatusCode = statusCode;
            Code = code;
            Details = details;
        }

        public static AppException NotFound(string message, string code = "NOT_FOUND") =>
            new(404, code, message);

        public static AppException BadRequest(string message, string code = "BAD_REQUEST") =>
            new(400, code, message);

        public static AppException Unauthorized(string message, string code = "UNAUTHORIZED") =>
            new(401, code, message);

        public static AppException Forbidden(string message, string code = "FORBIDDEN") =>
            new(403, code, message);

        public static AppException Conflict(string message, string code = "CONFLICT") =>
            new(409, code, message);

        public static AppException Unprocessable(string code, string message) =>
            new(422, code, message);
    }
}
