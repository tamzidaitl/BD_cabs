using AutoMapper;
using BdCabs.Api.Common;
using BdCabs.Api.Data;
using BdCabs.Api.DTOs;
using BdCabs.Api.Interfaces;
using BdCabs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BdCabs.Api.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public UserService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<PagedResult<UserDto>> List(int page, int pageSize, string? search)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var query = _db.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                query = query.Where(u =>
                    u.FullName.ToLower().Contains(term) ||
                    u.Email.ToLower().Contains(term) ||
                    u.Phone.Contains(term));
            }

            var totalCount = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = _mapper.Map<List<UserDto>>(users);
            return PagedResult<UserDto>.Create(items, totalCount, page, pageSize);
        }

        public async Task<UserDto> GetById(Guid id)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id)
                ?? throw AppException.NotFound("User not found.");
            return _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto> SetStatus(Guid id, string status)
        {
            if (!AccountStatus.IsValid(status))
            {
                throw AppException.BadRequest(
                    $"Invalid status. Allowed: {string.Join(", ", AccountStatus.All)}.",
                    "INVALID_STATUS");
            }

            var user = await _db.Users.FindAsync(id)
                ?? throw AppException.NotFound("User not found.");

            user.Status = status;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }
    }
}
