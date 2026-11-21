using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public sealed class TicketDbContext(DbContextOptions<TicketDbContext> options) : DbContext(options)
{
    public DbSet<Ticket> Tickets => Set<Ticket>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var ticket = modelBuilder.Entity<Ticket>();
        ticket.ToTable("Tickets");
        ticket.HasKey(x => x.Id);
        ticket.Property(x => x.Title).IsRequired().HasMaxLength(120);
        ticket.Property(x => x.Description).IsRequired();
        ticket.Property(x => x.Status).IsRequired().HasMaxLength(20);
        ticket.Property(x => x.Priority).IsRequired().HasMaxLength(20);
        ticket.Property(x => x.CreatedAt).IsRequired();
        ticket.Property(x => x.UpdatedAt).IsRequired();
        ticket.HasIndex(x => x.Status);
        ticket.HasIndex(x => x.Title);
    }
}
