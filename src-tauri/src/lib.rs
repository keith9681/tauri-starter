pub mod api;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        // Custom scheme `appapi`: no TCP listen port.
        // Windows/Android fetch base: http://appapi.localhost
        // macOS/Linux: appapi://localhost
        .register_asynchronous_uri_scheme_protocol("appapi", |_ctx, request, responder| {
            tauri::async_runtime::spawn(async move {
                let response = api::dispatch_protocol(request).await;
                responder.respond(response);
            });
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
