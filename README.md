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

## AI vs me — Stage 6 (containerizing with Postgres + Docker)

**My prompt:**

```
Containerize an existing Express CRUD API for a to-do list, moving its storage
from SQLite to PostgreSQL, using Node.js, the pg driver, and Docker Compose.

Requirements:
- Connect to Postgres using a DATABASE_URL read from an environment variable,
  never a hardcoded password
- Create a "tasks" table if missing: id (serial primary key), title (text),
  done (boolean)
- Seed 3 example tasks only if the table is empty (first-run only, no
  duplicates on restart)
- Keep these five endpoints with identical behavior to the existing API:
  GET /tasks, GET /tasks/:id (404 with {"error": "Task not found"} if
  missing), POST /tasks (400 if title missing/empty, 201 with created task),
  PUT /tasks/:id (partial updates allowed, 400 if both title and done
  missing, 404 if unknown id, 200 with updated task), DELETE /tasks/:id
  (404 if unknown id, 204 on success)
- All queries must use parameterized placeholders, never string-glued SQL
- Write a Dockerfile for the app
- Write a docker-compose file with two services: api and db (postgres image),
  with a named volume so data survives "docker compose down" and "up" again
- The whole stack should start with a single "docker compose up" command
```

The AI's code lives in `ai-version/` (`server.js`, `Dockerfile`, `compose.yaml`), separate from my Stage 0–5 stack.

**A note on how I tested this stage:** I don't have Docker running in every environment I reviewed this in, so alongside actually running `docker compose up` on my own machine, I also read through the AI's `Dockerfile` and `compose.yaml` line-by-line to check for correctness (multi-stage syntax, health check logic, environment variable references) before trusting it blindly.

### What did the AI do better?

- **Error handling.** Every one of the AI's routes wraps its database calls in `try/catch` and forwards errors to `next(err)`, which Express uses to run a proper error-handling middleware (even though none is defined here, this is the correct pattern to build on). My version has zero error handling — if a query ever throws (e.g. the database briefly drops a connection), my server would crash the whole process instead of returning a clean error response.
- **A real health check for the database, not just the app.** The AI's `compose.yaml` adds a `healthcheck` to the `db` service using `pg_isready`, and makes `api` wait for `db` to report healthy (`condition: service_healthy`) before starting — not just "wait for the container to exist" (`depends_on: [db]`), which is what my compose file does. My version's `depends_on` only guarantees the *container* has started, not that Postgres is actually ready to accept connections yet — meaning my app could try to connect before the database is truly up, especially on a slow first boot.
- **Smaller image.** It used `node:20-alpine` and `postgres:16-alpine` instead of the full-size images I used. Alpine-based images are much smaller (a fraction of the size), which means faster builds and smaller downloads — a genuine, measurable improvement I didn't think about.
- **`--omit=dev`** on `npm install`, skipping devDependencies in the final image — smaller, more production-appropriate build.
- **Schema constraints** (`NOT NULL`, `DEFAULT false`) on the table, same category of improvement as it made in the SQLite migration back in Assignment 2 — defends against bad data at the database level, not just in application code.
- **`restart: unless-stopped`** on both services — if a container crashes, Compose restarts it automatically. My compose file has no restart policy at all.
- **It didn't hardcode the password directly in `compose.yaml`.** It used `${POSTGRES_PASSWORD}` — a variable substituted in from `.env` — whereas my `compose.yaml` has `dev` typed directly into the file itself. This is actually a real violation of the assignment's own core requirement ("password... never hardcoded or committed") that I didn't catch in my own code — the AI handled this correctly and I didn't.

### What did it get wrong or quietly ignore?

- It dropped `GET /`, `GET /health`, and the Swagger UI setup at `/docs` entirely — I didn't mention any of them in this prompt, so this is really my own gap (see below), not something the AI "ignored" against instructions.
- It didn't include my `search` and `done` query-string filtering on `GET /tasks` — same reason, I didn't specify it.
- The `POST /tasks` route seeds all 3 example tasks in a single multi-row `INSERT` statement rather than three separate calls. This is arguably *better* (one round-trip instead of three), but it's a deviation from literally what I described ("seed 3 example tasks") without me specifying *how* — worth noting as an example of the AI making a reasonable implementation choice I hadn't constrained.

### What did my prompt forget to specify?

I never mentioned the existing `GET /`, `/health`, Swagger UI setup, or the `search`/`done` filters already built into my real `GET /tasks` — so none of it appears in the AI's version, even though it exists in my actual project. I also never said anything about error handling, health checks for the database container, or image size — three areas where the AI made independent, reasonable choices I hadn't asked for at all, some clearly better than what I built by hand.

### Rematch — what changed

I added four things to my prompt: keep the existing `GET /`, `/health`, and Swagger UI routes untouched; keep the `search` and `done` query filters on `GET /tasks`; wrap all database calls in try/catch with error handling; and use a `pg_isready` healthcheck so the app waits for Postgres to be truly ready, not just started. After regenerating, the AI incorporated all four correctly — confirming again that the AI's blind spots were entirely about what I hadn't described, not about its own judgment.