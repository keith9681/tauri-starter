mod error;
mod health;
mod openapi;
mod protocol;
mod state;
mod todos;

pub use openapi::ApiDoc;
pub use state::{resolve_app_home, AppState, StartupCode};

use axum::routing::get;
use axum::Router;
use std::sync::LazyLock;
use tower_http::cors::{Any, CorsLayer};

static STATE: LazyLock<AppState> = LazyLock::new(AppState::new);

/// Shared application state (same instance for desktop protocol + optional HTTP).
pub fn shared_state() -> AppState {
    STATE.clone()
}

/// Canonical API router — used by appapi protocol and `api:dev`.
/// Does not include Scalar UI (mounted only in the HTTP bypass bin).
pub fn app_router(state: AppState) -> Router {
    stateful_router().layer(cors_layer()).with_state(state)
}

/// Stateful routes (health, todos) before `AppState` is supplied.
/// Exposed so the desktop router can add native routes (window chrome) on top.
pub(crate) fn stateful_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health))
        .nest("/todos", todos::routes())
}

/// Shared CORS policy for the API surface.
pub(crate) fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
}

pub fn shared_router() -> Router {
    app_router(shared_state())
}

pub async fn dispatch_protocol(request: http::Request<Vec<u8>>) -> http::Response<Vec<u8>> {
    dispatch_router(shared_router(), request).await
}

/// Dispatch a protocol request through an arbitrary router (desktop or shared).
pub async fn dispatch_router(
    router: Router,
    request: http::Request<Vec<u8>>,
) -> http::Response<Vec<u8>> {
    protocol::dispatch(router, request).await
}
