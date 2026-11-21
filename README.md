# Support Ticket Tracker

## Run locally

Prerequisites: .NET 8 SDK, Node.js 20+, and SQL Server LocalDB (Windows) or SQL Server.

1. Configure `Backend/appsettings.json` or set the `ConnectionStrings:Tickets` environment variable.
2. Run the API: `dotnet run --project Backend/Backend.csproj`
3. Run the UI: `npm install && npm run dev`
4. Open `http://localhost:5173`; Swagger is available at `/swagger` on the API.

The API uses the port in `Backend/Properties/launchSettings.json`. Vite proxies `/api` to `http://localhost:5216`.

## Technology choices

ASP.NET Core 8 and Entity Framework Core provide typed controllers, async database access, migrations, and Swagger/OpenAPI. SQL Server is the production data store. React and TypeScript keep API models explicit and provide a responsive UI. xUnit and EF Core InMemory cover focused behavior without requiring a database.

## Assumptions

- Status and priority values are constrained to the values in the assessment.
- LocalDB is the default development database.
- Authentication is out of scope for this assessment.
- Search is a title substring search.

## Improve with more time

- Add JWT authentication and authorization.
- Add integration tests and database-backed test containers.
- Add optimistic concurrency and audit history.
- Add pagination controls and server-side caching.
- Add Docker Compose, CI, and deployment configuration.
