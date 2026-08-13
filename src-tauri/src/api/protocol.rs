use axum::body::Body;
use axum::http::{Request, Response};
use axum::Router;
use http_body_util::BodyExt;
use tower::ServiceExt;

/// Dispatch a protocol-level request through the shared axum Router.
pub async fn dispatch(router: Router, request: http::Request<Vec<u8>>) -> Response<Vec<u8>> {
    let (parts, body) = request.into_parts();
    let request = Request::from_parts(parts, Body::from(body));

    let response = match router.oneshot(request).await {
        Ok(response) => response,
        Err(_) => Response::builder()
            .status(500)
            .header(http::header::CONTENT_TYPE, "application/json")
            .body(Body::from(r#"{"error":"internal error"}"#))
            .expect("response"),
    };

    let (parts, body) = response.into_parts();
    let bytes = body
        .collect()
        .await
        .map(|c| c.to_bytes().to_vec())
        .unwrap_or_default();

    Response::from_parts(parts, bytes)
}
