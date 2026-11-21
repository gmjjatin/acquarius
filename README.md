# Support Ticket Tracker

## Run locally

Prerequisites: .NET 8 SDK, Node.js 20+, and SQL Server LocalDB (Windows) or SQL Server.

1. Configure `Backend/appsettings.json` or set the `ConnectionStrings:Tickets` environment variable.
2. Run the API: `dotnet run --project Backend/Backend.csproj`
3. Run the UI: `npm install && npm run dev`
4. Open `http://localhost:5173`; Swagger is available at `/swagger` on the API.

The API uses the port in `Backend/Properties/launchSettings.json`. Vite proxies `/api` to `http://localhost:5216`.

## Containerized deployment

Prerequisites: Docker Engine with the Compose plugin.

1. Copy `.env.example` to `.env` and set `SQLSERVER_SA_PASSWORD` to a unique, strong password.
2. Start the stack with `docker compose up --build -d`.
3. Open `http://localhost:8080`; the API Swagger UI is at `http://localhost:8080/swagger`.
4. Stop the stack with `docker compose down`. The SQL Server data volume is preserved.

Compose builds the frontend and ASP.NET API images and runs them with SQL Server 2022 Developer Edition. Database migrations run at API startup in this deployment through `Database__MigrateOnStartup`. The SQL Server port is not published to the host; only the web frontend is exposed, bound to localhost.

This Compose setup is intended for local development and single-host evaluation, not as-is for public production use. SQL Server Developer Edition is not licensed for production. For production, use a properly licensed SQL Server edition or managed database, store secrets in the deployment platform's secret manager, and put the app behind an HTTPS-enabled reverse proxy.

## Continuous integration

GitHub Actions runs the backend tests, frontend lint and production build, and builds both container images on pushes and pull requests.

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
