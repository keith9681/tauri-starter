mod error;
mod health;
mod openapi;
mod protocol;
mod state;
mod todos;
mod window_chrome;

pub use openapi::ApiDoc;
pub use state::{AppState, StartupCode};
pub use window_chrome::{bootstrap_window_chrome, set_app_handle};

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
    Router::new()
        .route("/health", get(health::health))
        .nest("/todos", todos::routes())
        .nest("/ui/window-chrome", window_chrome::routes())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}

pub fn shared_router() -> Router {
    app_router(shared_state())
}

pub async fn dispatch_protocol(request: http::Request<Vec<u8>>) -> http::Response<Vec<u8>> {
    protocol::dispatch(shared_router(), request).await
}
