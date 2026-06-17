namespace BdCabs.Api.Common
{
    /// <summary>
    /// Paginated list envelope. Mirrors the frontend `Paginated&lt;T&gt;` interface
    /// (packages/core/src/models/entities.ts): { items, totalCount, page, pageSize }.
    /// </summary>
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }

        public static PagedResult<T> Create(List<T> items, int totalCount, int page, int pageSize) =>
            new()
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            };
    }
}
