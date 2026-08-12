use crate::api::todos::{SqliteTodoStore, StoreError};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const DEFAULT_DB_PATH: &str = "todos.db";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupCode {
    DbBusy,
    DbError,
}

impl StartupCode {
    pub fn as_str(self) -> &'static str {
        match self {
            StartupCode::DbBusy => "db_busy",
            StartupCode::DbError => "db_error",
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    inner: Arc<AppStateInner>,
}

enum AppStateInner {
    Ready {
        todos: Mutex<SqliteTodoStore>,
        db_path: PathBuf,
    },
    Failed {
        code: StartupCode,
        message: String,
        db_path: PathBuf,
    },
}

impl AppState {
    pub fn new() -> Self {
        let path = std::env::var("TODOS_DB_PATH").unwrap_or_else(|_| DEFAULT_DB_PATH.to_string());
        Self::with_db_path(path)
    }

    pub fn with_db_path(path: impl AsRef<Path>) -> Self {
        let db_path = path.as_ref().to_path_buf();
        match SqliteTodoStore::open(&db_path) {
            Ok(store) => Self {
                inner: Arc::new(AppStateInner::Ready {
                    todos: Mutex::new(store),
                    db_path,
                }),
            },
            Err(StoreError::Busy) => Self {
                inner: Arc::new(AppStateInner::Failed {
                    code: StartupCode::DbBusy,
                    message: format!(
                        "数据库已被其他实例占用（{}）。请关闭已打开的应用后重试。",
                        db_path.display()
                    ),
                    db_path,
                }),
            },
            Err(err) => Self {
                inner: Arc::new(AppStateInner::Failed {
                    code: StartupCode::DbError,
                    message: format!("无法打开数据库（{}）：{err:?}", db_path.display()),
                    db_path,
                }),
            },
        }
    }

    pub fn db_path(&self) -> &Path {
        match self.inner.as_ref() {
            AppStateInner::Ready { db_path, .. } => db_path,
            AppStateInner::Failed { db_path, .. } => db_path,
        }
    }

    pub fn failure(&self) -> Option<(StartupCode, &str)> {
        match self.inner.as_ref() {
            AppStateInner::Ready { .. } => None,
            AppStateInner::Failed { code, message, .. } => Some((*code, message.as_str())),
        }
    }

    pub fn todos(&self) -> Result<&Mutex<SqliteTodoStore>, (StartupCode, String)> {
        match self.inner.as_ref() {
            AppStateInner::Ready { todos, .. } => Ok(todos),
            AppStateInner::Failed { code, message, .. } => Err((*code, message.clone())),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
