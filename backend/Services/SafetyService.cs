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
    /// Safety features (API_ENDPOINTS.md §12): the in-ride SOS button and
    /// "share my trip" with a trusted contact. SOS events are logged for Ops to
    /// resolve; trip shares mint a public token a contact can use to follow along.
    /// </summary>
    public class SafetyService : ISafetyService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public SafetyService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<SafetyEventDto> RaiseSos(Guid userId, SosDto dto)
        {
            if (dto.RideId is Guid rideId)
                await EnsureParticipant(userId, rideId);

            var ev = new SafetyEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RideId = dto.RideId,
                Kind = SafetyEventKind.Sos,
                Lat = dto.Lat,
                Lng = dto.Lng,
                Status = SafetyEventStatus.Active,
                CreatedAt = DateTime.UtcNow,
            };
            _db.SafetyEvents.Add(ev);
            await _db.SaveChangesAsync();
            return _mapper.Map<SafetyEventDto>(ev);
        }

        public async Task<SafetyEventDto> ShareTrip(Guid userId, ShareTripDto dto)
        {
            await EnsureParticipant(userId, dto.RideId);

            var ev = new SafetyEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RideId = dto.RideId,
                Kind = SafetyEventKind.TripShare,
                ContactName = dto.ContactName.Trim(),
                ContactPhone = dto.ContactPhone.Trim(),
                ShareToken = Guid.NewGuid().ToString("N"),
                Status = SafetyEventStatus.Active,
                CreatedAt = DateTime.UtcNow,
            };
            _db.SafetyEvents.Add(ev);
            await _db.SaveChangesAsync();
            return _mapper.Map<SafetyEventDto>(ev);
        }

        private async Task EnsureParticipant(Guid userId, Guid rideId)
        {
            var owns = await _db.Rides.AnyAsync(r => r.Id == rideId && (r.CustomerId == userId || r.DriverId == userId));
            if (!owns)
                throw AppException.Forbidden("You are not a participant in this ride.");
        }
    }
}
