# AGENTS.md

面向 AI / 协作者的项目约定。人类可读总览见 [README.md](README.md)。

## 项目是什么

Windows 优先的 Tauri 2 桌面待办：Vite + React + TypeScript 前端，Rust（axum）后端，SQLite 持久化。

## 硬性约束（不要破坏）

1. **`src/` 禁止引入 `@tauri-apps/*`**。前端只通过 `fetch` 调 API（见 `src/api/client.ts`）。
2. **axum `app_router` 是唯一路由源**（`src-tauri/src/api/mod.rs`）。新业务在此挂载；桌面 `appapi` 与 `api:dev` 必须共用同一套 handlers。
3. **桌面主路径不监听 TCP**。进程内自定义协议 `appapi` → `dispatch_protocol` → Router oneshot。不要把「起 HTTP 服务」当成桌面默认方案。
4. **Scalar / OpenAPI UI 只挂在 `api` bin**（`src-tauri/src/bin/api.rs`），不要塞进 `app_router`。
5. **测试不要改全局 `TODOS_DB_PATH` 污染开发库**；用 `AppState::with_db_path(临时路径)`。
6. **Release / `tauri:run` 要能开 DevTools**：依赖 Cargo feature `devtools`（见 `src-tauri/Cargo.toml`）。正式商店分发前再评估是否关闭。

## 架构速查

```text
桌面：  src --fetch--> http://appapi.localhost --oneshot--> app_router --> SQLite
旁路：  src --fetch--> http://127.0.0.1:8787  --serve-->   同一 Router（+ Scalar）
```

| 路径 | 职责 |
|------|------|
| `src/api/client.ts` | API base 解析 + todos 客户端 |
| `src-tauri/src/api/mod.rs` | `app_router` / `shared_state` / 协议入口 |
| `src-tauri/src/api/protocol.rs` | HTTP Request ↔ oneshot |
| `src-tauri/src/api/state.rs` | `AppState::new` / `with_db_path` |
| `src-tauri/src/api/todos/` | model / handlers / SQLite store |
| `src-tauri/src/bin/api.rs` | 开发 HTTP + Scalar |
| `src-tauri/tests/todos_api.rs` | 集成测试（oneshot + tempfile） |

## 常用命令

包管理用 **bun**（不要默认改成 npm/pnpm）。

| 命令 | 何时用 |
|------|--------|
| `bun run tauri:dev` | 日常桌面开发 |
| `bun run api:dev` | 浏览器联调 / Scalar |
| `bun run web:dev` | 仅 Vite（需另开 `api:dev`） |
| `bun run api:test` | API 集成测试 |
| `bun run tauri:portable` | 便携 exe（`--no-bundle`） |
| `bun run tauri:installer` | NSIS 安装包 |

## 扩展指南

### 新增 API 资源

1. 在 `src-tauri/src/api/<resource>/` 加 model、handlers、store（或复用现有模式）。
2. 在 `app_router` 上 `.nest("/...", routes())`。
3. 如需文档：utoipa 注解 + `openapi.rs` 的 `ApiDoc`；Scalar 仍只在 `api` bin。
4. 在 `src/api/client.ts`（或同层模块）加 `fetch` 封装；前端 UI 只依赖该客户端。
5. 在 `src-tauri/tests/` 用 oneshot + `AppState::with_db_path` 补集成测试。

### 持久化

- 默认库：`todos.db`（已 gitignore）。
- 环境变量：`TODOS_DB_PATH`（仅运行时隔离，**测试优先 `with_db_path`**）。
- Store 实现：`SqliteTodoStore`（`rusqlite` bundled）。

### 前端

- React 函数组件；与后端契约以 JSON todos API 为准。
- API base：`VITE_API_BASE` 可覆盖；否则桌面 `http://appapi.localhost`，浏览器 `http://127.0.0.1:8787`。

## 明确不做（除非用户明确要求）

- 在前端重新引入 Tauri `invoke` / 插件 SDK 作为主通信方式
- 用 `axum-test` 或真实 TCP 端口做默认集成测试（oneshot 已够）
- 把 Scalar 打进便携桌面包
- 未确认就改打包目标、协议名、或提交无关大重构

## 提交与文档

- 未明确要求时不要 `git commit` / `push`。
- 行为或命令变更时同步更新 `README.md`；本文件只保留 agent 约束与扩展路径，避免与 README 长文重复。
