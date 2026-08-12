import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createTodo,
  deleteTodo,
  listTodos,
  Todo,
  updateTodo,
} from "./api/client";
import "./App.css";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setTodos(await listTodos());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const next = title.trim();
    if (!next) return;

    setError(null);
    try {
      const todo = await createTodo(next);
      setTodos((prev) => [...prev, todo]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onToggle(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    try {
      const updated = await updateTodo(todo.id, { done: !todo.done });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <main className="app">
      <header className="header">
        <h1>待办事项</h1>
        <p className="subtitle">
          {loading ? "加载中…" : `未完成 ${remaining} / 共 ${todos.length}`}
        </p>
      </header>

      <form className="composer" onSubmit={onAdd}>
        <input
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          placeholder="添加一件事…"
          aria-label="新待办"
          autoFocus
        />
        <button type="submit" disabled={!title.trim()}>
          添加
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? "done" : undefined}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                disabled={busyId === todo.id}
                onChange={() => void onToggle(todo)}
              />
              <span>{todo.title}</span>
            </label>
            <button
              type="button"
              className="ghost"
              disabled={busyId === todo.id}
              onClick={() => void onRemove(todo.id)}
            >
              删除
            </button>
          </li>
        ))}
      </ul>

      {!loading && todos.length === 0 ? (
        <p className="empty">还没有待办，先添加一条吧。</p>
      ) : null}
    </main>
  );
}

export default App;
