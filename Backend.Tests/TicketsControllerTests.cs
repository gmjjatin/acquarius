using Backend.Controllers;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class TicketsControllerTests
{
    private static TicketDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TicketDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new TicketDbContext(options);
    }

    [Fact]
    public async Task CreateAddsTicket()
    {
        await using var db = CreateDb();
        var controller = new TicketsController(db);
        var request = new CreateTicketRequest
        {
            Title = "Printer offline",
            Description = "Second floor",
            Status = "open",
            Priority = "high"
        };

        var action = await controller.Create(request, CancellationToken.None);
        var ticket = Assert.IsType<Ticket>(Assert.IsType<CreatedAtActionResult>(action.Result).Value);

        Assert.Equal("Printer offline", ticket.Title);
        Assert.Equal("high", ticket.Priority);
        Assert.Equal(1, await db.Tickets.CountAsync());
    }

    [Fact]
    public async Task CreateRejectsInvalidStatusThroughModelValidation()
    {
        await using var db = CreateDb();
        var controller = new TicketsController(db);
        controller.ModelState.AddModelError("Status", "Status must be open, in_progress, or closed.");

        Assert.False(controller.ModelState.IsValid);
    }

    [Fact]
    public async Task ListFiltersByStatusAndSearchesTitle()
    {
        await using var db = CreateDb();
        db.Tickets.AddRange(
            new Ticket { Title = "Printer offline", Status = "open", Priority = "high" },
            new Ticket { Title = "Printer setup", Status = "closed", Priority = "low" },
            new Ticket { Title = "VPN issue", Status = "open", Priority = "medium" });
        await db.SaveChangesAsync();
        var controller = new TicketsController(db);

        var action = await controller.List("open", null, "Printer", 1, 10, CancellationToken.None);
        var result = Assert.IsType<PagedResult<Ticket>>(action.Value);

        Assert.Equal(1, result.Total);
        Assert.Equal("Printer offline", Assert.Single(result.Items).Title);
    }

    [Fact]
    public async Task ListSupportsFiveTicketPages()
    {
        // Verify both page metadata and that a partial final page contains only remaining items.
        await using var db = CreateDb();
        for (var i = 1; i <= 7; i++)
            db.Tickets.Add(new Ticket { Title = $"Ticket {i}", Status = "open", Priority = "medium" });
        await db.SaveChangesAsync();
        var controller = new TicketsController(db);

        var action = await controller.List(null, null, null, 2, 5, CancellationToken.None);
        var result = Assert.IsType<PagedResult<Ticket>>(action.Value);

        Assert.Equal(7, result.Total);
        Assert.Equal(2, result.Page);
        Assert.Equal(5, result.PageSize);
        Assert.Equal(2, result.Items.Count);
    }

    [Fact]
    public async Task ListFiltersByPriority()
    {
        await using var db = CreateDb();
        db.Tickets.AddRange(
            new Ticket { Title = "Low ticket", Status = "open", Priority = "low" },
            new Ticket { Title = "Medium ticket", Status = "open", Priority = "medium" },
            new Ticket { Title = "High ticket", Status = "open", Priority = "high" });
        await db.SaveChangesAsync();
        var controller = new TicketsController(db);

        var action = await controller.List(null, "high", null, 1, 5, CancellationToken.None);
        var result = Assert.IsType<PagedResult<Ticket>>(action.Value);

        Assert.Equal(1, result.Total);
        Assert.Equal("High ticket", Assert.Single(result.Items).Title);
    }
}
