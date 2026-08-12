use axum::body::Body;
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tauri_app_lib::api::{app_router, AppState};
use tempfile::NamedTempFile;
use tower::ServiceExt;

fn test_app() -> (axum::Router, NamedTempFile) {
    let db = NamedTempFile::new().expect("temp db");
    let state = AppState::with_db_path(db.path());
    (app_router(state), db)
}

async fn request(
    app: axum::Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
) -> (u16, Value) {
    let builder = axum::http::Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");

    let req = if let Some(body) = body {
        builder
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap()
    } else {
        builder.body(Body::empty()).unwrap()
    };

    let response = app.oneshot(req).await.expect("oneshot");
    let status = response.status().as_u16();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();

    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    };
    (status, json)
}

#[tokio::test]
async fn list_empty() {
    let (app, _db) = test_app();
    let (status, body) = request(app, "GET", "/todos", None).await;
    assert_eq!(status, 200);
    assert_eq!(body, json!([]));
}

#[tokio::test]
async fn create_and_list() {
    let (app, _db) = test_app();

    let (status, created) = request(
        app.clone(),
        "POST",
        "/todos",
        Some(json!({ "title": "买牛奶" })),
    )
    .await;
    assert_eq!(status, 200);
    assert_eq!(created["title"], "买牛奶");
    assert_eq!(created["done"], false);
    assert!(created["id"].as_u64().unwrap() >= 1);

    let (status, list) = request(app, "GET", "/todos", None).await;
    assert_eq!(status, 200);
    assert_eq!(list.as_array().unwrap().len(), 1);
    assert_eq!(list[0]["title"], "买牛奶");
}

#[tokio::test]
async fn create_rejects_empty_title() {
    let (app, _db) = test_app();
    let (status, body) = request(app, "POST", "/todos", Some(json!({ "title": "  " }))).await;
    assert_eq!(status, 400);
    assert_eq!(body["error"], "标题不能为空");
}

#[tokio::test]
async fn update_and_delete() {
    let (app, _db) = test_app();

    let (_, created) = request(
        app.clone(),
        "POST",
        "/todos",
        Some(json!({ "title": "写周报" })),
    )
    .await;
    let id = created["id"].as_u64().unwrap();

    let (status, updated) = request(
        app.clone(),
        "PATCH",
        &format!("/todos/{id}"),
        Some(json!({ "done": true, "title": "写完周报" })),
    )
    .await;
    assert_eq!(status, 200);
    assert_eq!(updated["done"], true);
    assert_eq!(updated["title"], "写完周报");

    let (status, _) = request(app.clone(), "DELETE", &format!("/todos/{id}"), None).await;
    assert_eq!(status, 200);

    let (status, list) = request(app, "GET", "/todos", None).await;
    assert_eq!(status, 200);
    assert!(list.as_array().unwrap().is_empty());
}

#[tokio::test]
async fn missing_todo_returns_404() {
    let (app, _db) = test_app();

    let (status, body) = request(
        app.clone(),
        "PATCH",
        "/todos/999",
        Some(json!({ "done": true })),
    )
    .await;
    assert_eq!(status, 404);
    assert_eq!(body["error"], "待办不存在");

    let (status, body) = request(app, "DELETE", "/todos/999", None).await;
    assert_eq!(status, 404);
    assert_eq!(body["error"], "待办不存在");
}
