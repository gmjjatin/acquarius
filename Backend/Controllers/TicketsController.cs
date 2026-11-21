using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/tickets")]
public sealed class TicketsController(TicketDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<Ticket>>> List(
        [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (page < 1 || pageSize is < 1 or > 100)
            return Problem("Page must be at least 1 and pageSize must be between 1 and 100.", statusCode: 400);
        if (status is not null && status is not ("open" or "in_progress" or "closed"))
            return Problem("Status must be open, in_progress, or closed.", statusCode: 400);

        IQueryable<Ticket> query = db.Tickets.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => EF.Functions.Like(x.Title, $"%{search}%"));

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResult<Ticket> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Ticket>> Get(Guid id, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return ticket is null ? Problem("Ticket not found.", statusCode: 404) : ticket;
    }

    [HttpPost]
    public async Task<ActionResult<Ticket>> Create(CreateTicketRequest request, CancellationToken cancellationToken)
    {
        var ticket = new Ticket
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = request.Status,
            Priority = request.Priority
        };
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = ticket.Id }, ticket);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Ticket>> Update(Guid id, UpdateTicketRequest request, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (ticket is null) return Problem("Ticket not found.", statusCode: 404);
        ticket.Title = request.Title.Trim();
        ticket.Description = request.Description.Trim();
        ticket.Status = request.Status;
        ticket.Priority = request.Priority;
        ticket.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ticket;
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (ticket is null) return Problem("Ticket not found.", statusCode: 404);
        db.Tickets.Remove(ticket);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<TicketSummary>> Summary(CancellationToken cancellationToken)
    {
        var statusRows = await db.Tickets.AsNoTracking()
            .GroupBy(x => x.Status).Select(x => new { x.Key, Count = x.Count() }).ToListAsync(cancellationToken);
        var priorityRows = await db.Tickets.AsNoTracking()
            .GroupBy(x => x.Priority).Select(x => new { x.Key, Count = x.Count() }).ToListAsync(cancellationToken);
        return new TicketSummary
        {
            ByStatus = statusRows.ToDictionary(x => x.Key, x => x.Count, StringComparer.Ordinal),
            ByPriority = priorityRows.ToDictionary(x => x.Key, x => x.Count, StringComparer.Ordinal)
        };
    }
}
