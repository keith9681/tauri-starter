use crate::api::state::{AppState, StartupCode};
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

/// 启动 / 数据库健康状态
#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({ "ok": true, "db_path": "todos.db" }))]
pub struct HealthResponse {
    /// 是否可用
    pub ok: bool,
    /// 当前库文件路径
    pub db_path: String,
    /// 失败时的错误码：`db_busy` | `db_error`
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    /// 失败说明
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 探测数据库是否可被本进程独占使用。
#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    summary = "健康检查",
    description = "启动探活：同目录多实例占用 `todos.db` 时返回 503（`db_busy`）。",
    responses(
        (status = 200, description = "数据库可用", body = HealthResponse),
        (status = 503, description = "数据库不可用（占用或打开失败）", body = HealthResponse)
    )
)]
pub async fn health(State(state): State<AppState>) -> Response {
    let db_path = state.db_path().display().to_string();
    match state.failure() {
        None => (
            StatusCode::OK,
            Json(HealthResponse {
                ok: true,
                db_path,
                code: None,
                error: None,
            }),
        )
            .into_response(),
        Some((code, message)) => {
            let code = match code {
                StartupCode::DbBusy => "db_busy",
                StartupCode::DbError => "db_error",
            };
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthResponse {
                    ok: false,
                    db_path,
                    code: Some(code.into()),
                    error: Some(message.to_string()),
                }),
            )
                .into_response()
        }
    }
}
