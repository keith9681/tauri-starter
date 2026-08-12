pub mod api;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Custom scheme `appapi`: no TCP listen port.
        // Windows/Android fetch base: http://appapi.localhost
        // macOS/Linux: appapi://localhost
        .register_uri_scheme_protocol("appapi", |_ctx, request| {
            api::protocol_response(request)
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
