//! Optional local HTTP API for pure-browser frontend debugging.
//! Serves the same axum Router as the desktop `appapi` protocol,
//! plus Scalar / OpenAPI (dev-only; not mounted on desktop).

use axum::routing::get;
use axum::Json;
use std::net::SocketAddr;
use tauri_app_lib::api::{app_router, shared_state, ApiDoc};
use utoipa::OpenApi;
use utoipa_scalar::{Scalar, Servable};

#[tokio::main]
async fn main() {
    let app = app_router(shared_state())
        .merge(Scalar::with_url("/scalar", ApiDoc::openapi()))
        .route(
            "/api-docs/openapi.json",
            get(|| async { Json(ApiDoc::openapi()) }),
        );

    let addr = SocketAddr::from(([127, 0, 0, 1], 8787));
    println!("browser API listening on http://{addr} (dev bypass only)");
    println!("Scalar UI: http://{addr}/scalar");
    println!("OpenAPI JSON: http://{addr}/api-docs/openapi.json");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind 127.0.0.1:8787");
    axum::serve(listener, app).await.expect("server");
}
