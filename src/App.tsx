import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createTodo,
  deleteTodo,
  getHealth,
  listTodos,
  type Health,
  type Todo,
  updateTodo,
} from "./api/client";
import "./App.css";

function StartupErrorPage({ health }: { health: Health }) {
  const busy = health.code === "db_busy";
  return (
    <main className="app startup-error">
      <header className="header">
        <h1>启动异常</h1>
        <p className="subtitle">
          {busy
            ? "数据库已被其他实例占用"
            : "无法打开本地数据库"}
        </p>
      </header>
      <p className="startup-message">
        {health.error ??
          (busy
            ? "请关闭已打开的应用后重新启动。"
            : "请检查库文件权限或路径后重试。")}
      </p>
      {health.db_path ? (
        <p className="startup-path">
          库文件：<code>{health.db_path}</code>
        </p>
      ) : null}
      {busy ? (
        <p className="startup-hint">关闭占用该库的窗口后，再启动本程序即可。</p>
      ) : null}
    </main>
  );
}

function TodoApp() {
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

function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await getHealth();
        if (!cancelled) setHealth(next);
      } catch (e) {
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : String(e));
          setHealth({
            ok: false,
            db_path: "",
            code: "db_error",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) {
    return (
      <main className="app">
        <header className="header">
          <h1>待办事项</h1>
          <p className="subtitle">{bootError ?? "正在检查数据库…"}</p>
        </header>
      </main>
    );
  }

  if (!health.ok) {
    return <StartupErrorPage health={health} />;
  }

  return <TodoApp />;
}

export default App;
