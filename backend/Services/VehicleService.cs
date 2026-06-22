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
            if (dto.RentalPeriod is not null && !RentalPeriod.IsValid(dto.RentalPeriod))
                throw AppException.BadRequest($"Invalid rental period. Allowed: {string.Join(", ", RentalPeriod.All)}.", "INVALID_RENTAL_PERIOD");

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
                RentalPeriod = dto.ForRent ? dto.RentalPeriod ?? Models.RentalPeriod.Monthly : dto.RentalPeriod,
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

            // Mark which of these cars are currently in a driver's hands so the owner
            // UI can lock status changes (mirrors the SetStatus guard).
            var vehicleIds = vehicles.Select(v => v.Id).ToList();
            var rentedOut = (await _db.RentalAgreements.AsNoTracking()
                .Where(a => vehicleIds.Contains(a.VehicleId) &&
                            (a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved))
                .Select(a => a.VehicleId)
                .ToListAsync()).ToHashSet();
            // A car committed to a corporate rental contract is equally locked.
            foreach (var id in await _db.CorporateRentalContracts.AsNoTracking()
                .Where(c => vehicleIds.Contains(c.VehicleId) &&
                            (c.Status == CorporateRentalStatus.Approved || c.Status == CorporateRentalStatus.Active))
                .Select(c => c.VehicleId)
                .ToListAsync())
                rentedOut.Add(id);

            var dtos = _mapper.Map<List<VehicleDto>>(vehicles);
            foreach (var dto in dtos)
                dto.IsRentedOut = rentedOut.Contains(dto.Id);
            return dtos;
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
            if (dto.RentalPeriod is not null)
            {
                if (!RentalPeriod.IsValid(dto.RentalPeriod))
                    throw AppException.BadRequest($"Invalid rental period. Allowed: {string.Join(", ", RentalPeriod.All)}.", "INVALID_RENTAL_PERIOD");
                vehicle.RentalPeriod = dto.RentalPeriod;
            }
            // Offering a vehicle for rent without a stated cadence defaults to monthly.
            if (dto.ForRent is true && vehicle.RentalPeriod is null)
                vehicle.RentalPeriod = Models.RentalPeriod.Monthly;
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
            bool hasCorporateContract = await _db.CorporateRentalContracts.AnyAsync(c =>
                c.VehicleId == vehicleId &&
                (c.Status == CorporateRentalStatus.Approved || c.Status == CorporateRentalStatus.Active));
            if (hasActiveAgreement || hasCorporateContract)
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

            // While a car is rented out it's in the driver's hands — the owner can't
            // change its operational status until the rental ends. The same holds while
            // it's committed to a corporate rental contract.
            bool rentedOut = await _db.RentalAgreements.AnyAsync(a =>
                a.VehicleId == vehicleId &&
                (a.Status == RentalStatus.Active || a.Status == RentalStatus.Approved));
            bool corporateCommitted = await _db.CorporateRentalContracts.AnyAsync(c =>
                c.VehicleId == vehicleId &&
                (c.Status == CorporateRentalStatus.Approved || c.Status == CorporateRentalStatus.Active));
            if (rentedOut || corporateCommitted)
                throw AppException.Conflict("This vehicle is currently rented out and its status cannot be changed until the rental ends.", "VEHICLE_RENTED_OUT");

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
