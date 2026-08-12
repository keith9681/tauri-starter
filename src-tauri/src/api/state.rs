use crate::api::todos::SqliteTodoStore;
use std::path::Path;
use std::sync::{Arc, Mutex};

const DEFAULT_DB_PATH: &str = "todos.db";

#[derive(Clone)]
pub struct AppState {
    pub todos: Arc<Mutex<SqliteTodoStore>>,
}

impl AppState {
    pub fn new() -> Self {
        let path = std::env::var("TODOS_DB_PATH").unwrap_or_else(|_| DEFAULT_DB_PATH.to_string());
        Self::with_db_path(path)
    }

    pub fn with_db_path(path: impl AsRef<Path>) -> Self {
        let path = path.as_ref();
        let store = SqliteTodoStore::open(path).unwrap_or_else(|e| {
            panic!("open sqlite db at {}: {e:?}", path.display());
        });
        Self {
            todos: Arc::new(Mutex::new(store)),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
