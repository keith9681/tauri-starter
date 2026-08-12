use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

/// 错误响应体
#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({ "error": "标题不能为空" }))]
pub struct ErrorBody {
    /// 错误说明
    pub error: String,
}

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    NotFound(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            ApiError::NotFound(message) => (StatusCode::NOT_FOUND, message),
        };

        (
            status,
            Json(ErrorBody {
                error: message,
            }),
        )
            .into_response()
    }
}
