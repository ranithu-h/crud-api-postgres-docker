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
