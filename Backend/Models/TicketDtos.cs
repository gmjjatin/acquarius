using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public sealed class CreateTicketRequest
{
    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [RegularExpression("^(open|in_progress|closed)$")]
    public string Status { get; set; } = "open";

    [RegularExpression("^(low|medium|high)$")]
    public string Priority { get; set; } = "medium";
}

public sealed class UpdateTicketRequest
{
    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [RegularExpression("^(open|in_progress|closed)$")]
    public string Status { get; set; } = "open";

    [RegularExpression("^(low|medium|high)$")]
    public string Priority { get; set; } = "medium";
}

public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int Total { get; init; }
}

public sealed class TicketSummary
{
    public Dictionary<string, int> ByStatus { get; init; } = new(StringComparer.Ordinal);
    public Dictionary<string, int> ByPriority { get; init; } = new(StringComparer.Ordinal);
}
