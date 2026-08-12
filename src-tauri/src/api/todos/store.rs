use super::model::Todo;

#[derive(Debug)]
pub enum StoreError {
    NotFound,
    Invalid(String),
}

pub trait TodoStore: Send {
    fn list(&self) -> Vec<Todo>;
    fn create(&mut self, title: String) -> Result<Todo, StoreError>;
    fn update(
        &mut self,
        id: u64,
        title: Option<String>,
        done: Option<bool>,
    ) -> Result<Todo, StoreError>;
    fn delete(&mut self, id: u64) -> Result<(), StoreError>;
}

#[derive(Debug, Default)]
pub struct MemoryTodoStore {
    next_id: u64,
    items: Vec<Todo>,
}

impl MemoryTodoStore {
    pub fn new() -> Self {
        Self {
            next_id: 1,
            items: Vec::new(),
        }
    }
}

impl TodoStore for MemoryTodoStore {
    fn list(&self) -> Vec<Todo> {
        self.items.clone()
    }

    fn create(&mut self, title: String) -> Result<Todo, StoreError> {
        let title = title.trim().to_string();
        if title.is_empty() {
            return Err(StoreError::Invalid("标题不能为空".into()));
        }

        let todo = Todo {
            id: self.next_id,
            title,
            done: false,
        };
        self.next_id += 1;
        self.items.push(todo.clone());
        Ok(todo)
    }

    fn update(
        &mut self,
        id: u64,
        title: Option<String>,
        done: Option<bool>,
    ) -> Result<Todo, StoreError> {
        let todo = self
            .items
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or(StoreError::NotFound)?;

        if let Some(title) = title {
            let title = title.trim().to_string();
            if title.is_empty() {
                return Err(StoreError::Invalid("标题不能为空".into()));
            }
            todo.title = title;
        }
        if let Some(done) = done {
            todo.done = done;
        }
        Ok(todo.clone())
    }

    fn delete(&mut self, id: u64) -> Result<(), StoreError> {
        let before = self.items.len();
        self.items.retain(|t| t.id != id);
        if self.items.len() == before {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }
}
