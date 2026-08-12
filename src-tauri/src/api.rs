use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::{LazyLock, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: u64,
    pub title: String,
    pub done: bool,
}

#[derive(Debug, Deserialize)]
struct CreateTodo {
    title: String,
}

#[derive(Debug, Deserialize)]
struct UpdateTodo {
    title: Option<String>,
    done: Option<bool>,
}

struct Store {
    next_id: u64,
    items: Vec<Todo>,
}

static STORE: LazyLock<Mutex<Store>> = LazyLock::new(|| {
    Mutex::new(Store {
        next_id: 1,
        items: Vec::new(),
    })
});

fn json_ok(value: impl Serialize) -> (u16, &'static str, Vec<u8>) {
    (
        200,
        "application/json",
        serde_json::to_vec(&value).unwrap_or_default(),
    )
}

fn json_err(status: u16, message: &str) -> (u16, &'static str, Vec<u8>) {
    (
        status,
        "application/json",
        serde_json::to_vec(&json!({ "error": message })).unwrap_or_default(),
    )
}

fn parse_todo_id(path: &str) -> Option<u64> {
    path.strip_prefix("/todos/")?.parse().ok()
}

/// Shared request handler for custom URI protocol and optional HTTP bypass.
pub fn handle_request(method: &str, path: &str, body: &[u8]) -> (u16, &'static str, Vec<u8>) {
    if method.eq_ignore_ascii_case("OPTIONS") {
        return (204, "text/plain", Vec::new());
    }

    let path = path.trim_end_matches('/');
    let method = method.to_ascii_uppercase();

    match (method.as_str(), path) {
        ("GET", "/todos") => {
            let store = STORE.lock().expect("todos lock");
            json_ok(&store.items)
        }
        ("POST", "/todos") => {
            let CreateTodo { title } = match serde_json::from_slice(body) {
                Ok(v) => v,
                Err(_) => return json_err(400, "invalid body"),
            };
            let title = title.trim().to_string();
            if title.is_empty() {
                return json_err(400, "title required");
            }

            let mut store = STORE.lock().expect("todos lock");
            let todo = Todo {
                id: store.next_id,
                title,
                done: false,
            };
            store.next_id += 1;
            store.items.push(todo.clone());
            json_ok(todo)
        }
        ("PATCH", p) if parse_todo_id(p).is_some() => {
            let id = parse_todo_id(p).unwrap();
            let UpdateTodo { title, done } = match serde_json::from_slice(body) {
                Ok(v) => v,
                Err(_) => return json_err(400, "invalid body"),
            };

            let mut store = STORE.lock().expect("todos lock");
            let Some(todo) = store.items.iter_mut().find(|t| t.id == id) else {
                return json_err(404, "todo not found");
            };
            if let Some(title) = title {
                let title = title.trim().to_string();
                if title.is_empty() {
                    return json_err(400, "title required");
                }
                todo.title = title;
            }
            if let Some(done) = done {
                todo.done = done;
            }
            json_ok(todo.clone())
        }
        ("DELETE", p) if parse_todo_id(p).is_some() => {
            let id = parse_todo_id(p).unwrap();
            let mut store = STORE.lock().expect("todos lock");
            let before = store.items.len();
            store.items.retain(|t| t.id != id);
            if store.items.len() == before {
                return json_err(404, "todo not found");
            }
            json_ok(json!({ "ok": true }))
        }
        _ => json_err(404, "not found"),
    }
}

pub fn protocol_response(request: http::Request<Vec<u8>>) -> http::Response<Vec<u8>> {
    let method = request.method().as_str();
    let path = request.uri().path();
    let (status, content_type, body) = handle_request(method, path, request.body());

    http::Response::builder()
        .status(status)
        .header(http::header::CONTENT_TYPE, content_type)
        .header(http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(
            http::header::ACCESS_CONTROL_ALLOW_METHODS,
            "GET, POST, PATCH, DELETE, OPTIONS",
        )
        .header(
            http::header::ACCESS_CONTROL_ALLOW_HEADERS,
            "Content-Type",
        )
        .body(body)
        .unwrap_or_else(|_| {
            http::Response::builder()
                .status(500)
                .body(Vec::new())
                .expect("response")
        })
}
