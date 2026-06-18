using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    /// <summary>
    /// Vehicle registration and lifecycle (API_ENDPOINTS.md §4): an owner registers a
    /// vehicle (which enters Ops verification as pending), edits it, activates /
    /// deactivates / marks it under maintenance, and uploads papers/insurance/fitness
    /// documents for verification.
    /// </summary>
    public class VehicleService : IVehicleService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public VehicleService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<VehicleDto> Create(Guid ownerId, VehicleCreateDto dto)
        {
            if (!VehicleType.IsValid(dto.Type))
                throw AppException.BadRequest($"Invalid vehicle type. Allowed: {string.Join(", ", VehicleType.All)}.", "INVALID_VEHICLE_TYPE");
            if (dto.ForRent && dto.RentalPriceMinor is < 0)
                throw AppException.BadRequest("Rental price cannot be negative.", "INVALID_RENTAL_PRICE");

            var photos = NormalizePhotos(dto.PhotoUrls);
            if (photos.Count is < 1 or > 5)
                throw AppException.BadRequest("Upload between 1 and 5 photos.", "INVALID_PHOTO_COUNT");

            var now = DateTime.UtcNow;
            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                OwnerId = ownerId,
                Type = dto.Type,
                PlateNumber = dto.PlateNumber.Trim(),
                Make = dto.Make?.Trim(),
                Model = dto.Model?.Trim(),
                Color = dto.Color?.Trim(),
                Year = dto.Year,
                Description = dto.Description?.Trim(),
                PhotoUrls = photos,
                PhotoUrl = photos[0],
                // New vehicles are pending verification and start inactive until approved.
                VerificationStatus = Models.VerificationStatus.Pending,
                Status = VehicleStatus.Inactive,
                IsActive = false,
                ForRent = dto.ForRent,
                RentalPriceMinor = dto.RentalPriceMinor,
                RentalTerms = dto.RentalTerms?.Trim(),
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.Vehicles.Add(vehicle);
            await _db.SaveChangesAsync();
            return _mapper.Map<VehicleDto>(vehicle);
        }

        public async Task<List<VehicleDto>> ListMine(Guid userId)
        {
            // Vehicles the caller owns, plus any they actively rent (so a rental
            // driver can see — and upload documents for — the car they drive).
            var rentedIds = await _db.RentalAgreements.AsNoTracking()
                .Where(a => a.DriverId == userId &&
                            (a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved))
                .Select(a => a.VehicleId)
                .ToListAsync();

            var vehicles = await _db.Vehicles.AsNoTracking()
                .Where(v => v.OwnerId == userId || rentedIds.Contains(v.Id))
                .OrderByDescending(v => v.UpdatedAt)
                .ToListAsync();
            return _mapper.Map<List<VehicleDto>>(vehicles);
        }

        public async Task<VehicleDto> Update(Guid ownerId, Guid vehicleId, VehicleUpdateDto dto)
        {
            var vehicle = await GetOwned(ownerId, vehicleId);

            if (dto.Type is not null)
            {
                if (!VehicleType.IsValid(dto.Type))
                    throw AppException.BadRequest($"Invalid vehicle type. Allowed: {string.Join(", ", VehicleType.All)}.", "INVALID_VEHICLE_TYPE");
                vehicle.Type = dto.Type;
            }
            if (dto.PlateNumber is not null) vehicle.PlateNumber = dto.PlateNumber.Trim();
            if (dto.Make is not null) vehicle.Make = dto.Make.Trim();
            if (dto.Model is not null) vehicle.Model = dto.Model.Trim();
            if (dto.Color is not null) vehicle.Color = dto.Color.Trim();
            if (dto.Year is int year) vehicle.Year = year;
            if (dto.Description is not null) vehicle.Description = dto.Description.Trim();
            if (dto.PhotoUrls is not null)
            {
                var photos = NormalizePhotos(dto.PhotoUrls);
                if (photos.Count is < 1 or > 5)
                    throw AppException.BadRequest("Upload between 1 and 5 photos.", "INVALID_PHOTO_COUNT");
                vehicle.PhotoUrls = photos;
                vehicle.PhotoUrl = photos[0];
            }
            if (dto.ForRent is bool forRent) vehicle.ForRent = forRent;
            if (dto.RentalPriceMinor is int price) vehicle.RentalPriceMinor = price;
            if (dto.RentalTerms is not null) vehicle.RentalTerms = dto.RentalTerms.Trim();

            vehicle.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<VehicleDto>(vehicle);
        }

        public async Task Remove(Guid ownerId, Guid vehicleId)
        {
            var vehicle = await GetOwned(ownerId, vehicleId);

            bool hasActiveAgreement = await _db.RentalAgreements.AnyAsync(a =>
                a.VehicleId == vehicleId &&
                (a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved));
            if (hasActiveAgreement)
                throw AppException.Conflict("This vehicle has an active rental agreement and cannot be removed.", "VEHICLE_IN_USE");

            _db.Vehicles.Remove(vehicle);
            await _db.SaveChangesAsync();
        }

        public async Task<VehicleDto> SetStatus(Guid ownerId, Guid vehicleId, VehicleStatusDto dto)
        {
            var vehicle = await GetOwned(ownerId, vehicleId);
            if (!VehicleStatus.IsValid(dto.Status))
                throw AppException.BadRequest($"Invalid status. Allowed: {string.Join(", ", VehicleStatus.All)}.", "INVALID_VEHICLE_STATUS");

            // A vehicle can only be made active once Ops has verified it.
            if (dto.Status == VehicleStatus.Active && vehicle.VerificationStatus != Models.VerificationStatus.Approved)
                throw AppException.Forbidden("This vehicle must be verified before it can be activated.", "VEHICLE_NOT_VERIFIED");

            vehicle.Status = dto.Status;
            vehicle.IsActive = dto.Status == VehicleStatus.Active;
            vehicle.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<VehicleDto>(vehicle);
        }

        public async Task<VehicleDocumentDto> AddDocument(Guid userId, Guid vehicleId, VehicleDocumentCreateDto dto)
        {
            var vehicle = await GetManageable(userId, vehicleId);
            if (!DocumentType.IsValid(dto.Type))
                throw AppException.BadRequest($"Invalid document type. Allowed: {string.Join(", ", DocumentType.All)}.", "INVALID_DOCUMENT_TYPE");

            var now = DateTime.UtcNow;
            var doc = new VehicleDocument
            {
                Id = Guid.NewGuid(),
                VehicleId = vehicleId,
                // Documents always belong to the vehicle's owner, even when a rental
                // driver uploads the scan.
                OwnerId = vehicle.OwnerId,
                Type = dto.Type,
                DocumentUrl = dto.DocumentUrl.Trim(),
                Number = dto.Number?.Trim(),
                ExpiresAt = dto.ExpiresAt,
                VerificationStatus = Models.VerificationStatus.Pending,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.VehicleDocuments.Add(doc);
            await _db.SaveChangesAsync();
            return _mapper.Map<VehicleDocumentDto>(doc);
        }

        public async Task<List<VehicleDocumentDto>> ListDocuments(Guid userId, Guid vehicleId)
        {
            await GetManageable(userId, vehicleId);
            var docs = await _db.VehicleDocuments.AsNoTracking()
                .Where(d => d.VehicleId == vehicleId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<VehicleDocumentDto>>(docs);
        }

        /// <summary>Trim, drop blanks/duplicates, and cap each URL to the column length.</summary>
        private static List<string> NormalizePhotos(IEnumerable<string>? urls) =>
            (urls ?? Enumerable.Empty<string>())
                .Select(u => u?.Trim() ?? string.Empty)
                .Where(u => u.Length is > 0 and <= 512)
                .Distinct()
                .Take(5)
                .ToList();

        private async Task<Vehicle> GetOwned(Guid ownerId, Guid vehicleId)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId)
                ?? throw AppException.NotFound("Vehicle not found.");
            if (vehicle.OwnerId != ownerId)
                throw AppException.Forbidden("This vehicle does not belong to you.");
            return vehicle;
        }

        /// <summary>
        /// A vehicle the caller may manage documents for: either its owner, or a
        /// driver who actively rents it. Lets owner-drivers and rental drivers upload
        /// the car's papers/insurance/fitness scans.
        /// </summary>
        private async Task<Vehicle> GetManageable(Guid userId, Guid vehicleId)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId)
                ?? throw AppException.NotFound("Vehicle not found.");
            if (vehicle.OwnerId == userId)
                return vehicle;

            bool activeRenter = await _db.RentalAgreements.AnyAsync(a =>
                a.VehicleId == vehicleId && a.DriverId == userId &&
                (a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved));
            if (activeRenter)
                return vehicle;

            throw AppException.Forbidden("You cannot manage documents for this vehicle.");
        }
    }
}
