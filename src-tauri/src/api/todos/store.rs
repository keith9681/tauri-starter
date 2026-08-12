use super::model::Todo;
use rusqlite::{params, Connection, OptionalExtension};

#[derive(Debug)]
pub enum StoreError {
    NotFound,
    Invalid(String),
    Db(String),
}

impl From<rusqlite::Error> for StoreError {
    fn from(value: rusqlite::Error) -> Self {
        StoreError::Db(value.to_string())
    }
}

pub trait TodoStore: Send {
    fn list(&self) -> Result<Vec<Todo>, StoreError>;
    fn create(&mut self, title: String) -> Result<Todo, StoreError>;
    fn update(
        &mut self,
        id: u64,
        title: Option<String>,
        done: Option<bool>,
    ) -> Result<Todo, StoreError>;
    fn delete(&mut self, id: u64) -> Result<(), StoreError>;
}

pub struct SqliteTodoStore {
    conn: Connection,
}

impl SqliteTodoStore {
    pub fn open(path: impl AsRef<std::path::Path>) -> Result<Self, StoreError> {
        let conn = Connection::open(path.as_ref())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0
            );",
        )?;
        Ok(Self { conn })
    }

    fn get_by_id(&self, id: u64) -> Result<Todo, StoreError> {
        self.conn
            .query_row(
                "SELECT id, title, done FROM todos WHERE id = ?1",
                params![id],
                |row| {
                    Ok(Todo {
                        id: row.get::<_, i64>(0)? as u64,
                        title: row.get(1)?,
                        done: row.get::<_, i64>(2)? != 0,
                    })
                },
            )
            .optional()?
            .ok_or(StoreError::NotFound)
    }
}

impl TodoStore for SqliteTodoStore {
    fn list(&self) -> Result<Vec<Todo>, StoreError> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, title, done FROM todos ORDER BY id ASC")?;
        let rows = stmt.query_map([], |row| {
            Ok(Todo {
                id: row.get::<_, i64>(0)? as u64,
                title: row.get(1)?,
                done: row.get::<_, i64>(2)? != 0,
            })
        })?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row?);
        }
        Ok(items)
    }

    fn create(&mut self, title: String) -> Result<Todo, StoreError> {
        let title = title.trim().to_string();
        if title.is_empty() {
            return Err(StoreError::Invalid("标题不能为空".into()));
        }

        self.conn
            .execute("INSERT INTO todos (title, done) VALUES (?1, 0)", params![title])?;
        let id = self.conn.last_insert_rowid() as u64;
        self.get_by_id(id)
    }

    fn update(
        &mut self,
        id: u64,
        title: Option<String>,
        done: Option<bool>,
    ) -> Result<Todo, StoreError> {
        let mut current = self.get_by_id(id)?;

        if let Some(title) = title {
            let title = title.trim().to_string();
            if title.is_empty() {
                return Err(StoreError::Invalid("标题不能为空".into()));
            }
            current.title = title;
        }
        if let Some(done) = done {
            current.done = done;
        }

        self.conn.execute(
            "UPDATE todos SET title = ?1, done = ?2 WHERE id = ?3",
            params![current.title, if current.done { 1 } else { 0 }, id],
        )?;
        Ok(current)
    }

    fn delete(&mut self, id: u64) -> Result<(), StoreError> {
        let changed = self
            .conn
            .execute("DELETE FROM todos WHERE id = ?1", params![id])?;
        if changed == 0 {
            return Err(StoreError::NotFound);
        }
        Ok(())
    }
}
