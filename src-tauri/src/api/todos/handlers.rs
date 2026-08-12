use super::model::{CreateTodo, OkResponse, Todo, UpdateTodo};
use super::store::{StoreError, TodoStore};
use crate::api::error::{ApiError, ErrorBody};
use crate::api::state::AppState;
use axum::extract::{Path, State};
use axum::Json;
use std::sync::MutexGuard;

type ApiResult<T> = Result<T, ApiError>;

impl From<StoreError> for ApiError {
    fn from(value: StoreError) -> Self {
        match value {
            StoreError::NotFound => ApiError::NotFound("待办不存在".into()),
            StoreError::Invalid(msg) => ApiError::BadRequest(msg),
            StoreError::Db(msg) => ApiError::Internal(msg),
        }
    }
}

fn lock_store(state: &AppState) -> ApiResult<MutexGuard<'_, super::store::SqliteTodoStore>> {
    let todos = state
        .todos()
        .map_err(|(_code, message)| ApiError::ServiceUnavailable(message))?;
    Ok(todos.lock().expect("todos lock"))
}

/// 获取全部待办列表。
#[utoipa::path(
    get,
    path = "/todos",
    tag = "todos",
    summary = "列出待办",
    description = "返回 SQLite 中的全部待办事项（按创建顺序）。",
    responses(
        (status = 200, description = "待办列表", body = [Todo]),
        (status = 503, description = "数据库不可用", body = ErrorBody)
    )
)]
pub async fn list(State(state): State<AppState>) -> ApiResult<Json<Vec<Todo>>> {
    let store = lock_store(&state)?;
    Ok(Json(store.list()?))
}

/// 新建一条待办。
#[utoipa::path(
    post,
    path = "/todos",
    tag = "todos",
    summary = "创建待办",
    description = "根据标题创建待办；标题去除首尾空白后不能为空。",
    request_body(
        content = CreateTodo,
        description = "创建参数",
        example = json!({ "title": "买牛奶" })
    ),
    responses(
        (status = 200, description = "创建成功", body = Todo),
        (status = 400, description = "参数无效（如标题为空）", body = ErrorBody),
        (status = 503, description = "数据库不可用", body = ErrorBody)
    )
)]
pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<CreateTodo>,
) -> ApiResult<Json<Todo>> {
    let mut store = lock_store(&state)?;
    let todo = store.create(body.title)?;
    Ok(Json(todo))
}

/// 按 id 更新待办标题或完成状态。
#[utoipa::path(
    patch,
    path = "/todos/{id}",
    tag = "todos",
    summary = "更新待办",
    description = "部分更新：仅提交需要修改的字段。",
    params(
        ("id" = u64, Path, description = "待办唯一标识")
    ),
    request_body(
        content = UpdateTodo,
        description = "更新字段",
        example = json!({ "done": true })
    ),
    responses(
        (status = 200, description = "更新成功", body = Todo),
        (status = 400, description = "参数无效", body = ErrorBody),
        (status = 404, description = "待办不存在", body = ErrorBody),
        (status = 503, description = "数据库不可用", body = ErrorBody)
    )
)]
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(body): Json<UpdateTodo>,
) -> ApiResult<Json<Todo>> {
    let mut store = lock_store(&state)?;
    let todo = store.update(id, body.title, body.done)?;
    Ok(Json(todo))
}

/// 按 id 删除待办。
#[utoipa::path(
    delete,
    path = "/todos/{id}",
    tag = "todos",
    summary = "删除待办",
    description = "删除指定 id 的待办；不存在则返回 404。",
    params(
        ("id" = u64, Path, description = "待办唯一标识")
    ),
    responses(
        (status = 200, description = "删除成功", body = OkResponse),
        (status = 404, description = "待办不存在", body = ErrorBody),
        (status = 503, description = "数据库不可用", body = ErrorBody)
    )
)]
pub async fn delete(State(state): State<AppState>, Path(id): Path<u64>) -> ApiResult<Json<OkResponse>> {
    let mut store = lock_store(&state)?;
    store.delete(id)?;
    Ok(Json(OkResponse { ok: true }))
}
