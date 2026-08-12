use crate::api::error::ErrorBody;
use crate::api::health::{self, HealthResponse};
use crate::api::todos::handlers;
use crate::api::todos::model::{CreateTodo, OkResponse, Todo, UpdateTodo};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "待办事项 API",
        description = "桌面应用本地业务接口。桌面端经自定义协议 `appapi` 访问；浏览器联调可走 `api:dev`（含 Scalar 文档）。数据持久化到 SQLite（默认 `{TAURI_STARTER_HOME|/LocalAppData/<identifier>}/app_data.db`）。",
        version = "0.1.0"
    ),
    paths(
        health::health,
        handlers::list,
        handlers::create,
        handlers::update,
        handlers::delete,
    ),
    components(schemas(Todo, CreateTodo, UpdateTodo, OkResponse, ErrorBody, HealthResponse)),
    tags(
        (name = "health", description = "启动探活与数据库状态"),
        (name = "todos", description = "待办事项的增删改查")
    )
)]
pub struct ApiDoc;
