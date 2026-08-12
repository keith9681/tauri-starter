use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 待办事项
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": 1,
    "title": "买牛奶",
    "done": false
}))]
pub struct Todo {
    /// 唯一标识
    pub id: u64,
    /// 标题内容
    pub title: String,
    /// 是否已完成
    pub done: bool,
}

/// 创建待办的请求体
#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({ "title": "写周报" }))]
pub struct CreateTodo {
    /// 待办标题（不能为空）
    pub title: String,
}

/// 更新待办的请求体（字段均可选）
#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({ "title": "改标题", "done": true }))]
pub struct UpdateTodo {
    /// 新标题；省略则不修改
    pub title: Option<String>,
    /// 完成状态；省略则不修改
    pub done: Option<bool>,
}

/// 通用成功响应
#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({ "ok": true }))]
pub struct OkResponse {
    /// 是否成功
    pub ok: bool,
}
