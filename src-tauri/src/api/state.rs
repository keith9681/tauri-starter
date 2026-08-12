use crate::api::todos::SqliteTodoStore;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Must stay aligned with `identifier` in `tauri.conf.json`.
const APP_IDENTIFIER: &str = "com.wentongchen.tauri-app";
const DB_FILE_NAME: &str = "app_data.db";
const HOME_ENV: &str = "TAURI_STARTER_HOME";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupCode {
    DbError,
}

impl StartupCode {
    pub fn as_str(self) -> &'static str {
        match self {
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

/// Application data directory: `TAURI_STARTER_HOME` or platform local data + identifier.
pub fn resolve_app_home() -> PathBuf {
    if let Ok(home) = std::env::var(HOME_ENV) {
        let home = home.trim();
        if !home.is_empty() {
            return PathBuf::from(home);
        }
    }

    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(APP_IDENTIFIER)
}

pub fn resolve_db_path() -> PathBuf {
    resolve_app_home().join(DB_FILE_NAME)
}

impl AppState {
    pub fn new() -> Self {
        Self::with_db_path(resolve_db_path())
    }

    pub fn with_db_path(path: impl AsRef<Path>) -> Self {
        let db_path = path.as_ref().to_path_buf();
        if let Some(parent) = db_path.parent() {
            if let Err(err) = fs::create_dir_all(parent) {
                return Self {
                    inner: Arc::new(AppStateInner::Failed {
                        code: StartupCode::DbError,
                        message: format!(
                            "无法创建数据目录（{}）：{err}",
                            parent.display()
                        ),
                        db_path,
                    }),
                };
            }
        }

        match SqliteTodoStore::open(&db_path) {
            Ok(store) => Self {
                inner: Arc::new(AppStateInner::Ready {
                    todos: Mutex::new(store),
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
