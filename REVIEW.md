# Part 2: Code Review

## Sample 1: C# / ASP.NET Core

### Findings, ranked by severity

1. **Critical: SQL injection in `Search`.** The customer value is concatenated into SQL, allowing data theft or destructive statements. Use EF or a parameterized `SqlParameter`.
2. **Critical: hard-coded database credentials.** The SQL `sa` password is exposed in source and process configuration. Use managed identity or secret configuration.
3. **High: no dependency injection or resource disposal.** The context, connection, command, and reader are manually created and not guaranteed to be disposed. This leaks resources and conflicts with ASP.NET Core lifecycle guidance.
4. **High: synchronous blocking in `HttpClient`.** `GetStringAsync(...).Result` can deadlock and occupy request threads. Use typed `HttpClient`, `await`, and cancellation.
5. **High: tax parsing is untrusted.** `decimal.Parse` throws on invalid provider data and may vary by culture. Validate with `TryParse` and invariant culture.
6. **High: every exception in `Create` is hidden and 200 OK is returned.** Callers receive success even if the save fails. Log the exception and return 400/409/500 with ProblemDetails.
7. **High: external calls create an N+1 and failure amplification.** Each returned order makes a separate tax request. Cache/batch tax rates and use retries with circuit breakers.
8. **Medium: unvalidated overposting.** The public `Order` entity is accepted directly. Use create/update DTOs and `[ApiController]` validation.
9. **Medium: synchronous EF save.** `SaveChanges()` blocks the request thread. Use `SaveChangesAsync` and cancellation.
10. **Low: maintainability and type safety.** `SELECT *`, magic SQL, and manual mapping make schema drift and conversion bugs likely. Select named columns and use EF mapping.

### Rewritten C# sample

```csharp
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly ShopDbContext _db;
    private readonly HttpClient _http;

    public OrdersController(ShopDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _http = httpClientFactory.CreateClient("TaxService");
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<Order>>> Search(
        [FromQuery] string customer,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(customer))
            return ValidationProblem("Customer is required.");

        var orders = await _db.Orders.AsNoTracking()
            .Where(o => o.CustomerName.Contains(customer))
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var order in orders)
        {
            using var response = await _http.GetAsync($"tax/{order.Id}", cancellationToken);
            response.EnsureSuccessStatusCode();
            var rate = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!decimal.TryParse(rate, NumberStyles.AllowDecimalPoint,
                    CultureInfo.InvariantCulture, out var tax))
                return Problem("Tax service returned invalid data.", statusCode: 502);
            order.Tax = tax;
        }
        return Ok(orders);
    }

    [HttpPost]
    public async Task<ActionResult<Order>> Create(
        OrderCreateRequest request,
        CancellationToken cancellationToken)
    {
        var order = new Order
        {
            CustomerName = request.CustomerName,
            Total = request.Total
        };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Order>> Get(int id,
        CancellationToken cancellationToken)
    {
        var order = await _db.Orders.AsNoTracking()
            .SingleOrDefaultAsync(o => o.Id == id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }
}
```

## Sample 2: SQL Server

### Findings, ranked by severity

1. **High: `YEAR(OrderDate)` prevents an indexed range seek.** Apply an explicit start/end date range.
2. **High: leading wildcard in `c.Name LIKE '%' + @name + '%'` prevents normal index seeks.** It may cause customer-table scans.
3. **High: nullable `Refunds.OrderId` makes `NOT IN` return no rows in its worst case.** Use `NOT EXISTS`.
4. **Medium: `SELECT *` reads and returns unnecessary columns.** It is costly and fragile to schema changes.
5. **Medium: comma joins obscure intent.** Use explicit `JOIN` syntax.
6. **Medium: no pagination or stable tie ordering.** A report may need bounded pages and deterministic ordering.
7. **Low: behavior depends on collation and escaping.** Document the matching rules and collation.

### Rewritten query

```sql
SELECT o.Id, o.CustomerId, o.OrderDate, o.Total
FROM dbo.Orders AS o
WHERE o.OrderDate >= '20250101'
  AND o.OrderDate <  '20260101'
  AND EXISTS
  (
      SELECT 1
      FROM dbo.Customers AS c
      WHERE c.Id = o.CustomerId
        AND c.Name LIKE '%' + @name + '%'
  )
  AND NOT EXISTS
  (
      SELECT 1
      FROM dbo.Refunds AS r
      WHERE r.OrderId = o.Id
  )
ORDER BY o.OrderDate DESC
OPTION (RECOMPILE);
```

Candidate indexes: `Orders(OrderDate DESC, CustomerId)` with `Id, Total` included; `Customers(Id) INCLUDE (Name)`; `Refunds(OrderId)`; and for prefix-only names, `Customers(Name, Id)`. Use SQL Server full-text search if arbitrary contains matching is a common path.
