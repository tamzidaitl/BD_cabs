using BdCabs.Api.Common;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BdCabs.Api.Controllers
{
    /// <summary>
    /// Vehicle registration &amp; lifecycle (API_ENDPOINTS.md §4). Owners register and
    /// manage vehicles; owner-drivers may register their own car too, so both roles
    /// are allowed. Ownership is enforced per-row in the service.
    /// </summary>
    [ApiController]
    [Route("api/v1/vehicles")]
    [Authorize(Roles = $"{Roles.FleetOwner},{Roles.Driver}")]
    public class VehiclesController : ControllerBase
    {
        private readonly IVehicleService _vehicles;
        private readonly ICurrentUser _me;
        private readonly IWebHostEnvironment _env;

        // Vehicle photo uploads: cap size and restrict to common image types.
        private const long MaxPhotoBytes = 5 * 1024 * 1024;
        private static readonly Dictionary<string, string> AllowedImageTypes = new()
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif",
        };

        // Document uploads also allow PDFs (scans of papers / insurance / fitness).
        private const long MaxDocBytes = 10 * 1024 * 1024;
        private static readonly Dictionary<string, string> AllowedDocTypes = new()
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["application/pdf"] = ".pdf",
        };

        public VehiclesController(IVehicleService vehicles, ICurrentUser me, IWebHostEnvironment env)
        {
            _vehicles = vehicles;
            _me = me;
            _env = env;
        }

        private Guid Uid => _me.UserId ?? throw AppException.Unauthorized("Not authenticated.");

        /// <summary>
        /// Upload one vehicle photo (multipart/form-data field "file"); returns its
        /// stored URL. The register form uploads 1–5 of these, then submits the URLs
        /// with POST /vehicles.
        /// </summary>
        [HttpPost("photos")]
        public async Task<ActionResult<VehiclePhotoUploadResultDto>> UploadPhoto(IFormFile? file)
        {
            if (file is null || file.Length == 0)
                throw AppException.BadRequest("No file was uploaded.", "NO_FILE");
            if (file.Length > MaxPhotoBytes)
                throw AppException.BadRequest("Image must be 5 MB or smaller.", "FILE_TOO_LARGE");
            if (!AllowedImageTypes.TryGetValue(file.ContentType, out var ext))
                throw AppException.BadRequest("Only JPEG, PNG, WebP or GIF images are allowed.", "UNSUPPORTED_IMAGE_TYPE");

            // Persist under {ContentRoot}/uploads/vehicles and serve via /uploads (see Program.cs).
            var dir = Path.Combine(_env.ContentRootPath, "uploads", "vehicles");
            Directory.CreateDirectory(dir);
            var fileName = $"{Guid.NewGuid():N}{ext}";
            await using (var stream = System.IO.File.Create(Path.Combine(dir, fileName)))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"{Request.Scheme}://{Request.Host}/uploads/vehicles/{fileName}";
            return Ok(new VehiclePhotoUploadResultDto { Url = url });
        }

        /// <summary>
        /// Upload one vehicle document file — image or PDF (multipart field "file");
        /// returns its stored URL to pass to POST /vehicles/{id}/documents. Available
        /// to owners and to drivers (owner-drivers / rental drivers of the vehicle).
        /// </summary>
        [HttpPost("documents/upload")]
        public async Task<ActionResult<VehiclePhotoUploadResultDto>> UploadDocument(IFormFile? file)
        {
            if (file is null || file.Length == 0)
                throw AppException.BadRequest("No file was uploaded.", "NO_FILE");
            if (file.Length > MaxDocBytes)
                throw AppException.BadRequest("Document must be 10 MB or smaller.", "FILE_TOO_LARGE");
            if (!AllowedDocTypes.TryGetValue(file.ContentType, out var ext))
                throw AppException.BadRequest("Only JPEG, PNG, WebP or PDF files are allowed.", "UNSUPPORTED_DOC_TYPE");

            var dir = Path.Combine(_env.ContentRootPath, "uploads", "vehicle-docs");
            Directory.CreateDirectory(dir);
            var fileName = $"{Guid.NewGuid():N}{ext}";
            await using (var stream = System.IO.File.Create(Path.Combine(dir, fileName)))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"{Request.Scheme}://{Request.Host}/uploads/vehicle-docs/{fileName}";
            return Ok(new VehiclePhotoUploadResultDto { Url = url });
        }

        [HttpPost]
        public async Task<ActionResult<VehicleDto>> Create([FromBody] VehicleCreateDto dto)
            => StatusCode(StatusCodes.Status201Created, await _vehicles.Create(Uid, dto));

        [HttpGet("me")]
        public async Task<ActionResult<List<VehicleDto>>> Mine() => Ok(await _vehicles.ListMine(Uid));

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<VehicleDto>> Update(Guid id, [FromBody] VehicleUpdateDto dto)
            => Ok(await _vehicles.Update(Uid, id, dto));

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Remove(Guid id)
        {
            await _vehicles.Remove(Uid, id);
            return NoContent();
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<ActionResult<VehicleDto>> SetStatus(Guid id, [FromBody] VehicleStatusDto dto)
            => Ok(await _vehicles.SetStatus(Uid, id, dto));

        [HttpPost("{id:guid}/documents")]
        public async Task<ActionResult<VehicleDocumentDto>> AddDocument(Guid id, [FromBody] VehicleDocumentCreateDto dto)
            => StatusCode(StatusCodes.Status201Created, await _vehicles.AddDocument(Uid, id, dto));

        [HttpGet("{id:guid}/documents")]
        public async Task<ActionResult<List<VehicleDocumentDto>>> Documents(Guid id)
            => Ok(await _vehicles.ListDocuments(Uid, id));
    }
}
