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
    /// Support tickets — including complaints and fare disputes (API_ENDPOINTS.md
    /// §12). Threaded replies are a future extension; this persists the ticket.
    /// </summary>
    public class SupportService : ISupportService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public SupportService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<SupportTicketDto> Create(Guid userId, SupportTicketCreateDto dto)
        {
            var category = TicketCategory.IsValid(dto.Category) ? dto.Category : TicketCategory.Other;

            if (dto.RideId is Guid rideId)
            {
                var owns = await _db.Rides.AnyAsync(r => r.Id == rideId && (r.CustomerId == userId || r.DriverId == userId));
                if (!owns)
                    throw AppException.Forbidden("You cannot raise a ticket about a ride you were not part of.");
            }

            var now = DateTime.UtcNow;
            var ticket = new SupportTicket
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Category = category,
                Subject = dto.Subject.Trim(),
                Body = dto.Body.Trim(),
                RideId = dto.RideId,
                Status = TicketStatus.Open,
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.SupportTickets.Add(ticket);
            await _db.SaveChangesAsync();
            return _mapper.Map<SupportTicketDto>(ticket);
        }

        public async Task<List<SupportTicketDto>> ListMine(Guid userId)
        {
            var tickets = await _db.SupportTickets.AsNoTracking()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
            return _mapper.Map<List<SupportTicketDto>>(tickets);
        }

        public async Task<SupportTicketDto> Get(Guid userId, string role, Guid id)
        {
            var ticket = await _db.SupportTickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id)
                ?? throw AppException.NotFound("Ticket not found.");
            if (ticket.UserId != userId && role is not (Roles.SupportAdmin or Roles.SuperAdmin))
                throw AppException.Forbidden("This ticket does not belong to you.");
            return _mapper.Map<SupportTicketDto>(ticket);
        }
    }
}
