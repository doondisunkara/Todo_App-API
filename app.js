const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, isValid } = require("date-fns");

app = express();
app.use(express.json());

let db;
const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => console.log("Server is running"));
  } catch (e) {
    console.log(`${e.message}`);
  }
};

initializeDbAndServer();

const convertTodo = (todo) => {
  return {
    id: todo.id,
    todo: todo.todo,
    category: todo.category,
    priority: todo.priority,
    status: todo.status,
    dueDate: todo.due_date,
  };
};

const checkRequestQueries = (request, response, next) => {
  const { status, priority, search_q, category, date } = request.query;
  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    const categoryIsInArray = categoryArray.includes(category);
    if (categoryIsInArray === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    const priorityIsInArray = priorityArray.includes(priority);
    if (priorityIsInArray === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    const statusIsInArray = statusArray.includes(status);
    if (statusIsInArray === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  // Date verification block in checkRequestQueries function
  if (date !== undefined) {
    const isDateValid = isValid(new Date(date));
    if (isDateValid) {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      request.date = formattedDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.search_q = search_q;
  next();
};

const checkRequestBody = (request, response, next) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  const { todoId } = request.params;
  if (category !== undefined) {
    categoryArray = ["WORK", "HOME", "LEARNING"];
    categoryIsInArray = categoryArray.includes(category);

    if (categoryIsInArray === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (priority !== undefined) {
    priorityArray = ["HIGH", "MEDIUM", "LOW"];
    priorityIsInArray = priorityArray.includes(priority);
    if (priorityIsInArray === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    statusIsInArray = statusArray.includes(status);
    if (statusIsInArray === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (dueDate !== undefined) {
    const isDateValid = isValid(new Date(dueDate));
    if (isDateValid) {
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      request.dueDate = formattedDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.id = id;
  request.todo = todo;
  request.todoId = todoId;
  next();
};

//API 1
app.get("/todos/", checkRequestQueries, async (request, response) => {
  const { status = "", priority = "", search_q = "", category = "" } = request;
  const todosQuery = `
  SELECT 
  *
  FROM
  todo 
  WHERE 
  todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%'
  AND status LIKE '%${status}%' AND category LIKE '%${category}%';`;
  const todos = await db.all(todosQuery);
  response.send(todos.map((todo) => convertTodo(todo)));
});

//API 2 Specific Todo
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoQuery = `
     SELECT 
            *
            FROM 
            todo
            WHERE id LIKE ${todoId};
    `;
  const todo = await db.get(todoQuery);
  response.send(convertTodo(todo));
});

//API 3 Agenda
app.get("/agenda/", checkRequestQueries, async (request, response) => {
  const { date } = request;
  const getAgenda = `SELECT * FROM todo WHERE due_date = '${date}';`;
  const agenda = await db.all(getAgenda);
  response.send(agenda.map((eachTodo) => convertTodo(eachTodo)));
});

//API 4 Create Todo
app.post("/todos", checkRequestBody, async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request;
  const createTodo = `
    INSERT INTO todo (id, todo, category, priority, status, due_date)
    VALUES (
        ${id},
        '${todo}',
        '${category}',
        '${priority}',
        '${status}',
        '${dueDate}'
    );`;
  await db.run(createTodo);
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId", checkRequestBody, async (request, response) => {
  const { todoId } = request;
  const getPreviousTodo = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await db.get(getPreviousTodo);
  let responseText;
  const {
    status = previousTodo.status,
    priority = previousTodo.priority,
    todo = previousTodo.todo,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request;
  switch (true) {
    case status !== previousTodo.status:
      responseText = "Status Updated";
      break;
    case category !== previousTodo.category:
      responseText = "Category Updated";
      break;
    case todo !== previousTodo.todo:
      responseText = "Todo Updated";
      break;
    case priority !== previousTodo.priority:
      responseText = "Priority Updated";
      break;
    default:
      responseText = "Due Date Updated";
  }
  const updateQuery = `
  UPDATE todo
  SET
  todo = '${todo}',
  category = '${category}',
  priority = '${priority}',
  status = '${status}',
  due_date = '${dueDate}'
  WHERE id = ${todoId};`;
  await db.run(updateQuery);
  response.send(responseText);
});

//API 6 Delete Todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
        DELETE FROM todo 
        WHERE id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
