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
    /// Operations dashboard data. Counts come from real tables where this slice
    /// has them (users, drivers); ride-related KPIs are placeholders until the
    /// ride lifecycle (API_ENDPOINTS.md §5) is implemented.
    /// </summary>
    public class OpsService : IOpsService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public OpsService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<Dictionary<string, int>> Dashboard()
        {
            var totalUsers = await _db.Users.CountAsync();
            var totalDrivers = await _db.Users.CountAsync(u => u.Role == Roles.Driver);
            var onlineDrivers = await _db.DriverProfiles.CountAsync(d => d.IsOnline);
            var pendingDrivers = await _db.DriverProfiles
                .CountAsync(d => d.VerificationStatus == VerificationStatus.Pending);
            var pendingAccounts = await _db.Users.CountAsync(u => u.Status == AccountStatus.Pending);
            var activeCoupons = await _db.Coupons.CountAsync(c => c.Status == CouponStatus.Active);

            return new Dictionary<string, int>
            {
                ["totalUsers"] = totalUsers,
                ["totalDrivers"] = totalDrivers,
                ["onlineDrivers"] = onlineDrivers,
                ["pendingDriverVerifications"] = pendingDrivers,
                ["pendingAccounts"] = pendingAccounts,
                ["activeCoupons"] = activeCoupons,
                // Placeholders until the ride lifecycle lands:
                ["activeRides"] = 0,
                ["ridesToday"] = 0,
            };
        }

        public async Task<PagedResult<UserDto>> PendingDrivers(int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            // Drivers whose KYC is still pending, joined to their user record.
            var query =
                from d in _db.DriverProfiles.AsNoTracking()
                join u in _db.Users.AsNoTracking() on d.UserId equals u.Id
                where d.VerificationStatus == VerificationStatus.Pending
                orderby u.CreatedAt descending
                select u;

            var totalCount = await query.CountAsync();
            var users = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var items = _mapper.Map<List<UserDto>>(users);
            return PagedResult<UserDto>.Create(items, totalCount, page, pageSize);
        }
    }
}
