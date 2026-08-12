/** API base for desktop custom protocol (Windows/Android). */
const DESKTOP_API_BASE = "http://appapi.localhost";

/** Optional browser-only bypass (requires `bun run api:dev`). */
const BROWSER_API_BASE = "http://127.0.0.1:8787";

export type Todo = {
  id: number;
  title: string;
  done: boolean;
};

function resolveApiBase(): string {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/$/, "");
  }

  const hasTauriHost =
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

  return hasTauriHost ? DESKTOP_API_BASE : BROWSER_API_BASE;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${detail}`);
  }

  return (await res.json()) as T;
}

export function listTodos(): Promise<Todo[]> {
  return request<Todo[]>("/todos");
}

export function createTodo(title: string): Promise<Todo> {
  return request<Todo>("/todos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function updateTodo(
  id: number,
  patch: { title?: string; done?: boolean },
): Promise<Todo> {
  return request<Todo>(`/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteTodo(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/todos/${id}`, { method: "DELETE" });
}
