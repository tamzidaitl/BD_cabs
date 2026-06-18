using System.Text;
using BdCabs.Api.Common;
using BdCabs.Api.Configuration;
using BdCabs.Api.Data;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---- Configuration --------------------------------------------------------
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

// CORS origins for the local Next.js admin app (and any configured extras).
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

// ---- Database (PostgreSQL via EF Core) ------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---- AutoMapper -----------------------------------------------------------
builder.Services.AddAutoMapper(typeof(Program));

// ---- Application services (DI) --------------------------------------------
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICouponService, CouponService>();
builder.Services.AddScoped<IOpsService, OpsService>();
builder.Services.AddScoped<IFinanceService, FinanceService>();

// Customer & Driver flows
builder.Services.AddScoped<IRideService, RideService>();
builder.Services.AddScoped<IDriverService, DriverService>();
builder.Services.AddScoped<IPlaceService, PlaceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<ISupportService, SupportService>();
builder.Services.AddScoped<ISafetyService, SafetyService>();
builder.Services.AddScoped<IRentalService, RentalService>();

// Fleet / Vehicle Owner flows
builder.Services.AddScoped<IVehicleService, VehicleService>();
builder.Services.AddScoped<IFleetService, FleetService>();

// ---- Authentication / Authorization ---------------------------------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        // Emit the standard { error: {...} } envelope on auth failures too, so the
        // frontend ApiClient parses 401/403s consistently.
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                if (ctx.Response.HasStarted) return;
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                ctx.Response.ContentType = "application/json";
                var body = ApiError.Of("UNAUTHORIZED", "Authentication is required or the token is invalid.");
                await ctx.Response.WriteAsJsonAsync(body);
            },
            OnForbidden = async ctx =>
            {
                if (ctx.Response.HasStarted) return;
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json";
                var body = ApiError.Of("FORBIDDEN", "You do not have permission to perform this action.");
                await ctx.Response.WriteAsJsonAsync(body);
            },
        };
    });

builder.Services.AddAuthorization();

// ---- CORS -----------------------------------------------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// ---- Controllers + global validation envelope -----------------------------
builder.Services.AddControllers();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    // Turn model-validation failures into the { error: { code, message, details } }
    // envelope instead of ASP.NET's default ProblemDetails.
    options.InvalidModelStateResponseFactory = context =>
    {
        var details = context.ModelState
            .Where(e => e.Value is not null && e.Value.Errors.Count > 0)
            .SelectMany(e => e.Value!.Errors.Select(er => er.ErrorMessage))
            .ToList();

        var body = ApiError.Of("VALIDATION_ERROR", "One or more fields are invalid.", details);
        return new BadRequestObjectResult(body);
    };
});

// ---- Swagger (with JWT bearer support) ------------------------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "BD Cabs API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT access token (without the 'Bearer ' prefix).",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

var app = builder.Build();

// ---- Middleware pipeline --------------------------------------------------
app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Serve uploaded files (e.g. profile photos) from {ContentRoot}/uploads at /uploads.
var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads",
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

// ---- Migrate + seed on startup -------------------------------------------
await DbSeeder.SeedAsync(app.Services, app.Configuration);

app.Run();
