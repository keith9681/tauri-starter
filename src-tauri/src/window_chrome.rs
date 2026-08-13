//! Desktop window chrome (theme + background). No-ops when no AppHandle (e.g. `api:dev`).
//!
//! Preference is persisted under the app data dir so cold starts can paint correctly
//! before the window is shown. If no file exists yet, the window stays hidden until
//! the frontend posts chrome (or a short fallback timeout).
//!
//! This module lives at the crate root (NOT under `api`) because it depends on `tauri`
//! types. Keeping `api` tauri-free means the `todos_api` integration test binary does
//! not link wry / WebView2Loader and can run without a native window environment.

use crate::api::{resolve_app_home, AppState};
use axum::routing::post;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Manager, Theme, WebviewWindow};

static APP: OnceLock<AppHandle> = OnceLock::new();

const COLOR_MODE_FILE: &str = "color_mode";

/// Light/dark body tokens from Astryx neutral (see `astryx docs color`).
const BG_LIGHT: (u8, u8, u8, u8) = (0xf1, 0xf4, 0xf7, 0xff);
const BG_DARK: (u8, u8, u8, u8) = (0x11, 0x11, 0x12, 0xff);

pub fn set_app_handle(app: AppHandle) {
    let _ = APP.set(app);
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ColorMode {
    System,
    Light,
    Dark,
}

impl ColorMode {
    fn as_str(self) -> &'static str {
        match self {
            ColorMode::System => "system",
            ColorMode::Light => "light",
            ColorMode::Dark => "dark",
        }
    }

    fn parse(raw: &str) -> Option<Self> {
        match raw.trim() {
            "system" => Some(ColorMode::System),
            "light" => Some(ColorMode::Light),
            "dark" => Some(ColorMode::Dark),
            _ => None,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct WindowChromeRequest {
    pub mode: ColorMode,
    pub effective: EffectiveChrome,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EffectiveChrome {
    Light,
    Dark,
}

#[derive(Serialize)]
pub struct WindowChromeResponse {
    pub ok: bool,
    pub applied: bool,
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/", post(set_window_chrome))
}

/// Desktop-only router: the shared API router plus the native window-chrome route.
/// Used by the `appapi` protocol; the browser bypass (`api:dev`) does not include this.
pub fn desktop_router(state: AppState) -> Router {
    crate::api::stateful_router()
        .nest("/ui/window-chrome", routes())
        .layer(crate::api::cors_layer())
        .with_state(state)
}

fn color_mode_path() -> std::path::PathBuf {
    resolve_app_home().join(COLOR_MODE_FILE)
}

fn has_saved_mode() -> bool {
    color_mode_path().is_file()
}

fn read_saved_mode() -> ColorMode {
    fs::read_to_string(color_mode_path())
        .ok()
        .and_then(|s| ColorMode::parse(&s))
        .unwrap_or(ColorMode::System)
}

fn persist_mode(mode: ColorMode) {
    let path = color_mode_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(path, mode.as_str());
}

fn effective_for(window: &WebviewWindow, mode: ColorMode) -> EffectiveChrome {
    match mode {
        ColorMode::Light => EffectiveChrome::Light,
        ColorMode::Dark => EffectiveChrome::Dark,
        ColorMode::System => match window.theme() {
            Ok(Theme::Dark) => EffectiveChrome::Dark,
            _ => EffectiveChrome::Light,
        },
    }
}

fn apply_chrome(window: &WebviewWindow, mode: ColorMode, effective: EffectiveChrome) {
    let theme = match mode {
        ColorMode::System => None,
        ColorMode::Light => Some(Theme::Light),
        ColorMode::Dark => Some(Theme::Dark),
    };
    let _ = window.set_theme(theme);

    let rgba = match effective {
        EffectiveChrome::Light => BG_LIGHT,
        EffectiveChrome::Dark => BG_DARK,
    };
    let _ = window.set_background_color(Some(rgba.into()));
}

fn show_main(window: &WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

/// Apply persisted (or system) chrome, then show the main window.
pub fn apply_saved_chrome_and_show(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let mode = read_saved_mode();
    let effective = effective_for(&window, mode);
    apply_chrome(&window, mode, effective);
    show_main(&window);
}

/// Cold start: if we already know the preference, paint before show.
/// Otherwise keep the window hidden until the frontend posts chrome (or fallback).
pub fn bootstrap_window_chrome(app: &AppHandle) {
    if has_saved_mode() {
        apply_saved_chrome_and_show(app);
        return;
    }

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(2000)).await;
        if let Some(window) = handle.get_webview_window("main") {
            if !window.is_visible().unwrap_or(false) {
                apply_saved_chrome_and_show(&handle);
            }
        }
    });
}

async fn set_window_chrome(Json(body): Json<WindowChromeRequest>) -> Json<WindowChromeResponse> {
    persist_mode(body.mode);

    let Some(app) = APP.get() else {
        return Json(WindowChromeResponse {
            ok: true,
            applied: false,
        });
    };

    let Some(window) = app.get_webview_window("main") else {
        return Json(WindowChromeResponse {
            ok: true,
            applied: false,
        });
    };

    apply_chrome(&window, body.mode, body.effective);
    show_main(&window);

    Json(WindowChromeResponse {
        ok: true,
        applied: true,
    })
}
