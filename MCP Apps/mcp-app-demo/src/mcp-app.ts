/**
 * Client-side MCP App: Todo Liste
 * Verwendet die offizielle @modelcontextprotocol/ext-apps SDK.
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./mcp-app.css";

// --- Types ---

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

// --- DOM Elements ---

const mainEl = document.querySelector(".main") as HTMLElement;
const todoListEl = document.getElementById("todo-list")!;
const newTodoInput = document.getElementById("new-todo-input") as HTMLInputElement;
const addBtn = document.getElementById("add-btn")!;
const statusEl = document.getElementById("status")!;

// --- Helpers ---

function extractTodos(result: CallToolResult): TodoItem[] {
  const data = result.structuredContent as { todos?: TodoItem[] } | undefined;
  return data?.todos ?? [];
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTodos(todos: TodoItem[]) {
  todoListEl.innerHTML = "";

  if (todos.length === 0) {
    todoListEl.innerHTML = '<li class="loading">Keine Todos vorhanden</li>';
    statusEl.textContent = "";
    return;
  }

  const doneCount = todos.filter((t) => t.done).length;
  statusEl.textContent = `${doneCount} von ${todos.length} erledigt`;

  for (const todo of todos) {
    const li = document.createElement("li");
    if (todo.done) li.classList.add("done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.className = "todo-checkbox";
    checkbox.addEventListener("change", async () => {
      try {
        const result = await app.callServerTool({ name: "toggle-todo", arguments: { id: todo.id } });
        renderTodos(extractTodos(result));
      } catch (err) {
        console.error("Toggle error:", err);
      }
    });

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "\u00d7";
    deleteBtn.title = "Loeschen";
    deleteBtn.addEventListener("click", async () => {
      try {
        const result = await app.callServerTool({ name: "delete-todo", arguments: { id: todo.id } });
        renderTodos(extractTodos(result));
      } catch (err) {
        console.error("Delete error:", err);
      }
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    todoListEl.appendChild(li);
  }
}

// --- Host Context ---

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

// --- App Setup ---

// 1. Create app instance
const app = new App({ name: "Todo App", version: "1.0.0" });

// 2. Register handlers BEFORE connecting
app.onteardown = async () => {
  console.info("App is being torn down");
  return {};
};

app.ontoolinput = (params) => {
  console.info("Received tool input:", params);
};

app.ontoolresult = (result) => {
  console.info("Received tool result:", result);
  renderTodos(extractTodos(result));
};

app.ontoolcancelled = (params) => {
  console.info("Tool cancelled:", params.reason);
};

app.onerror = console.error;

app.onhostcontextchanged = handleHostContextChanged;

// --- UI Event Handlers ---

async function addTodo() {
  const text = newTodoInput.value.trim();
  if (!text) return;

  addBtn.setAttribute("disabled", "true");
  try {
    const result = await app.callServerTool({ name: "add-todo", arguments: { text } });
    renderTodos(extractTodos(result));
    newTodoInput.value = "";
  } catch (err) {
    console.error("Add error:", err);
  } finally {
    addBtn.removeAttribute("disabled");
    newTodoInput.focus();
  }
}

addBtn.addEventListener("click", addTodo);

newTodoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTodo();
});

// 3. Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    handleHostContextChanged(ctx);
  }
});
