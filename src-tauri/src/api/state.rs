use crate::api::todos::MemoryTodoStore;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub todos: Arc<Mutex<MemoryTodoStore>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            todos: Arc::new(Mutex::new(MemoryTodoStore::new())),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
