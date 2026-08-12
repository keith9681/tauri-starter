//! Optional local HTTP API for pure-browser frontend debugging.
//! Not used by the desktop / portable production path.

use axum::body::Bytes;
use axum::http::{header, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::any;
use axum::Router;
use std::net::SocketAddr;
use tauri_app_lib::api::handle_request;
use tower_http::cors::{Any, CorsLayer};

async fn dispatch(method: Method, uri: axum::http::Uri, body: Bytes) -> Response {
    let (status, content_type, body) = handle_request(method.as_str(), uri.path(), &body);
    (
        StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
        [(header::CONTENT_TYPE, content_type)],
        body,
    )
        .into_response()
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new().fallback(any(dispatch)).layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8787));
    println!("browser API listening on http://{addr} (dev bypass only)");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind 127.0.0.1:8787");
    axum::serve(listener, app).await.expect("server");
}
