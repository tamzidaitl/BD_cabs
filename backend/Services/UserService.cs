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
        private readonly ICurrentUser _currentUser;

        public UserService(AppDbContext db, IMapper mapper, ICurrentUser currentUser)
        {
            _db = db;
            _mapper = mapper;
            _currentUser = currentUser;
        }

        public async Task<PagedResult<UserDto>> List(int page, int pageSize, string? search, string? role)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var query = _db.Users.AsNoTracking().AsQueryable();

            // Visibility rules (enforced server-side so the UI can't bypass them):
            //  - SuperAdmin accounts are seeded, not managed here — never listed.
            //  - Support Admins only see end users (Customer, Driver, Vehicle Owner,
            //    Corporate Client); other staff are hidden from them.
            query = query.Where(u => u.Role != Roles.SuperAdmin);
            if (_currentUser.Role == Roles.SupportAdmin)
            {
                query = query.Where(u => Roles.SupportVisible.Contains(u.Role));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                query = query.Where(u =>
                    u.FullName.ToLower().Contains(term) ||
                    u.Email.ToLower().Contains(term) ||
                    u.Phone.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                if (!Roles.IsValid(role))
                    throw AppException.BadRequest($"Invalid role filter '{role}'.", "INVALID_ROLE");
                query = query.Where(u => u.Role == role);
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

        public async Task<UserDto> CreateStaff(CreateStaffDto dto)
        {
            // Only the two internal staff roles can be created here; SuperAdmin is
            // seeded, never minted via the API.
            if (dto.Role != Roles.SupportAdmin && dto.Role != Roles.FinanceAdmin)
            {
                throw AppException.BadRequest(
                    $"Staff role must be {Roles.SupportAdmin} or {Roles.FinanceAdmin}.",
                    "INVALID_STAFF_ROLE");
            }

            var email = dto.Email.Trim().ToLowerInvariant();
            var phone = dto.Phone.Trim();

            if (await _db.Users.AnyAsync(u => u.Email == email))
                throw AppException.Conflict("Email already registered.", "EMAIL_TAKEN");
            if (await _db.Users.AnyAsync(u => u.Phone == phone))
                throw AppException.Conflict("Phone already registered.", "PHONE_TAKEN");

            var now = DateTime.UtcNow;
            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName.Trim(),
                Email = email,
                Phone = phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                Status = AccountStatus.Active, // staff are active immediately (role_wise_story.md)
                CreatedAt = now,
                UpdatedAt = now,
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

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

            // Support Admins may only ACTIVATE accounts; suspending/banning (i.e.
            // deactivating) is reserved for Super Admin. (The controller already
            // limits this endpoint to SupportAdmin + SuperAdmin.)
            if (_currentUser.Role == Roles.SupportAdmin && status != AccountStatus.Active)
            {
                throw AppException.Forbidden(
                    "Support Admins can only activate accounts. Deactivation requires a Super Admin.",
                    "ACTIVATE_ONLY");
            }

            var user = await _db.Users.FindAsync(id)
                ?? throw AppException.NotFound("User not found.");

            user.Status = status;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }

        public async Task DeleteUser(Guid id)
        {
            if (_currentUser.UserId == id)
                throw AppException.BadRequest("You cannot delete your own account.", "CANNOT_DELETE_SELF");

            var user = await _db.Users.FindAsync(id)
                ?? throw AppException.NotFound("User not found.");

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
        }
    }
}
