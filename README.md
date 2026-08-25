# Task API — Containerized (Postgres + Docker)

A CRUD API for a to-do list, built with Node.js and Express. This is the third storage swap in this project: memory (A1) → SQLite (A2) → PostgreSQL running in Docker (this version). Data now lives in a real database server, containerized alongside the app, and the whole stack starts with a single command.

## How to run

```bash
cp .env.example .env
docker compose up
```

The API starts on `http://localhost:3000`. On first run, the `tasks` table is created automatically and seeded with 3 example tasks.

## Environment variables

See `.env.example` for the required variable:

```
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/tasks
```

**Note:** when running via `docker compose up`, the app actually gets its `DATABASE_URL` from `compose.yaml` (using `db` as the hostname, since that's the database container's name on the Compose network) — not from `.env`. The `.env` file is used only when running the app standalone, outside Docker, with `node --env-file=.env server.js` — in that case the host is `localhost` instead.

## Endpoints

| Method | Path          | Description                          |
|--------|---------------|---------------------------------------|
| GET    | `/`           | API info (name, version, endpoints)   |
| GET    | `/health`     | Health check — confirms server is up  |
| GET    | `/tasks`      | List all tasks (supports `?search=` and `?done=false`) |
| GET    | `/tasks/:id`  | Get a single task by id               |
| POST   | `/tasks`      | Create a new task                     |
| PUT    | `/tasks/:id`  | Update a task's title and/or done     |
| DELETE | `/tasks/:id`  | Delete a task                         |

### Status codes used

- `200` — successful read/update
- `201` — task created
- `204` — task deleted (no content returned)
- `400` — invalid or missing input
- `404` — task not found

## Example request

```bash
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
```

```
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 40
ETag: W/"28-5HZKHl8n6LqowlFw/mkFjTdiFL4"
Date: Tue, 25 Aug 2026 11:49:51 GMT
Connection: keep-alive
Keep-Alive: timeout=5
{"id":5,"title":"Buy milk","done":false}
```
![Database screenshot](docs/docker-screenshot.png)

## Database

Data is stored in **PostgreSQL**, running in a Docker container (see `compose.yaml`). A named volume (`taskdata`) keeps the data even after `docker compose down`.

Screenshot of the data in the database (via `psql` or pgAdmin):

![Database screenshot](docs/postgres-screenshot.png)

## Notes

- `.env` holds the real database connection string and is git-ignored; `.env.example` is committed with placeholder values.
- The database password is never hardcoded anywhere in the codebase.
- All SQL queries use parameterized placeholders (`$1`, `$2`, ...) to prevent SQL injection.