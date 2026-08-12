pub mod handlers;
pub mod model;
mod store;

pub use store::{SqliteTodoStore, TodoStore};

use crate::api::state::AppState;
use axum::routing::{get, patch};
use axum::Router;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(handlers::list).post(handlers::create))
        .route("/{id}", patch(handlers::update).delete(handlers::delete))
}
