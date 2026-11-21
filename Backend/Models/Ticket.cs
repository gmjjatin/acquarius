using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public sealed class Ticket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public string Priority { get; set; } = "medium";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
