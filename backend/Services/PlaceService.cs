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
    /// Saved places — Home, Work, favourites (API_ENDPOINTS.md §10). "Recent"
    /// locations are derived from the customer's ride destinations, not stored.
    /// </summary>
    public class PlaceService : IPlaceService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public PlaceService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<SavedPlaceDto>> List(Guid userId)
        {
            var places = await _db.SavedPlaces.AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.Label)
                .ToListAsync();
            return _mapper.Map<List<SavedPlaceDto>>(places);
        }

        public async Task<SavedPlaceDto> Create(Guid userId, SavedPlaceCreateDto dto)
        {
            var now = DateTime.UtcNow;
            var place = new SavedPlace
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Label = dto.Label.Trim(),
                Address = dto.Address.Trim(),
                Lat = dto.Lat,
                Lng = dto.Lng,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.SavedPlaces.Add(place);
            await _db.SaveChangesAsync();
            return _mapper.Map<SavedPlaceDto>(place);
        }

        public async Task<SavedPlaceDto> Update(Guid userId, Guid id, SavedPlaceCreateDto dto)
        {
            var place = await GetOwned(userId, id);
            place.Label = dto.Label.Trim();
            place.Address = dto.Address.Trim();
            place.Lat = dto.Lat;
            place.Lng = dto.Lng;
            place.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return _mapper.Map<SavedPlaceDto>(place);
        }

        public async Task Delete(Guid userId, Guid id)
        {
            var place = await GetOwned(userId, id);
            _db.SavedPlaces.Remove(place);
            await _db.SaveChangesAsync();
        }

        public async Task<List<RecentPlaceDto>> Recent(Guid userId)
        {
            var recent = await _db.Rides.AsNoTracking()
                .Where(r => r.CustomerId == userId && r.DestAddress != null)
                .OrderByDescending(r => r.RequestedAt)
                .Take(20)
                .Select(r => new RecentPlaceDto
                {
                    Address = r.DestAddress!,
                    Lat = r.DestLat,
                    Lng = r.DestLng,
                    UsedAt = r.RequestedAt,
                })
                .ToListAsync();

            // De-dupe by address, keeping the most recent use.
            return recent
                .GroupBy(p => p.Address)
                .Select(g => g.First())
                .Take(10)
                .ToList();
        }

        private async Task<SavedPlace> GetOwned(Guid userId, Guid id)
        {
            var place = await _db.SavedPlaces.FirstOrDefaultAsync(p => p.Id == id)
                ?? throw AppException.NotFound("Saved place not found.");
            if (place.UserId != userId)
                throw AppException.Forbidden("This place does not belong to you.");
            return place;
        }
    }
}
