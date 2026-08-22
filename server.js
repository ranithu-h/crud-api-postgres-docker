import express from 'express';
const app = express();
app.use(express.json());

import Database from 'better-sqlite3';
const db = new Database('tasks.db');

db.exec("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT, done INTEGER);");
const countRow = db.prepare('SELECT COUNT(*) AS numrow FROM tasks').get()

if (countRow.numrow === 0){
  const data = [
    {title: "Task 4", done: 0},
    {title: "Task 5", done: 1},
    {title: "Task 6", done: 0}
  ]

  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?,?)");
  data.forEach((task)=>{
    insert.run(task.title, task.done);
  });
}


import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { title } from 'process';

const openapiDocument = JSON.parse(readFileSync('./docs/openapi.json', 'utf-8'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
const port = 3000;

app.get('/', (req, res) => {
  res.json({ "name": "Task API", 
    "version": "1.0", 
    "endpoints": ["/tasks"] });
});

app.get('/health', (req, res) => {
  res.json({ "status": "OK" });
});

app.get('/tasks', (req, res) => {
  const search = req.query.search;

  if (search !== undefined) {
    const results = db.prepare('SELECT * FROM tasks WHERE title LIKE ?').all(`%${search}%`);
    return res.json(results);
  }

  if (req.query.done === "false"){
    let not_dont_tasks = db.prepare('SELECT * FROM tasks WHERE done = 0').all()
    return res.json(not_dont_tasks)
  }
  const query = db.prepare('SELECT * FROM tasks').all();
  res.json(query);
});

app.get('/tasks/:id', (req, res) =>{
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task){
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(task);
});

app.post('/tasks', (req, res) => {
  const title = req.body.title

  if (!title){
    return res.status(400).json({error: "Missing Title"});
  }

  const query = db.prepare("INSERT INTO tasks (title, done) VALUES (?,?)").run(title, 0)

  res.status(201).json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(query.lastInsertRowid));
});

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  let title = req.body.title;
  let done = req.body.done;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)

  if (!task){
    return res.status(404).json({error: "Unknown id"});
  }

  if (title === undefined && done === undefined){
    return res.status(400).json({error: "Empty/Invalid body"})
  }

  if (title === undefined){
    title = task.title
  }
  if (done === undefined){
    done = task.done
  }
  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(title, done, id)

  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id))
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` })
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)

  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});