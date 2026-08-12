# tauri-starter

Tauri 2 + React + TypeScript 桌面待办（Windows 优先）。

前端 `src/` **不依赖** `@tauri-apps/*`。桌面侧经自定义 URI 协议 `appapi` 进程内调用后端（**不监听 TCP**）。**axum `Router` 为唯一路由源**：桌面协议与 `api:dev` 共用同一套 handlers。

## 技术栈

| 层 | 选型 |
|----|------|
| 壳 | Tauri 2（窗口 + `appapi` 协议） |
| 前端 | Vite 8 + React 19 + TypeScript（纯 Web / `fetch`） |
| 后端 | axum（唯一路由源） |
| 持久化 | SQLite（`rusqlite` bundled） |
| API 文档 | utoipa + Scalar（仅 `api:dev`） |
| 包管理 / 打包 | bun；便携 exe 或 NSIS |

## 架构

```text
桌面：  src/ --fetch--> http://appapi.localhost/... --oneshot--> axum --> SQLite
开发旁路：src/ --fetch--> http://127.0.0.1:8787/...  --serve--> 同一 Router
```

| 场景 | API Base | 占端口 |
|------|----------|--------|
| `tauri:dev` / 便携 exe | `http://appapi.localhost` | 否 |
| 浏览器 + `api:dev` | `http://127.0.0.1:8787` | 是（开发旁路） |

可用 `VITE_API_BASE` 覆盖前端 API 地址。

### 待办 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/todos` | 列表 |
| `POST` | `/todos` | 创建 `{ "title": "..." }` |
| `PATCH` | `/todos/:id` | 更新 `{ "title"?, "done"? }` |
| `DELETE` | `/todos/:id` | 删除 |

默认库文件：`%LOCALAPPDATA%\com.wentongchen.tauri-app\app_data.db`（可用 `TAURI_STARTER_HOME` 覆盖**应用数据目录**，库文件始终为该目录下的 `app_data.db`）。桌面端通过 `tauri-plugin-single-instance` 保持单例：重复启动会激活已打开窗口并退出新进程。

```powershell
$env:TAURI_STARTER_HOME = "D:\dev\tauri-starter-data"
bun run api:dev
```

### API 文档（仅 `api:dev`）

桌面协议 / 便携包**不**挂载文档 UI。

- Scalar：http://127.0.0.1:8787/scalar
- OpenAPI JSON：http://127.0.0.1:8787/api-docs/openapi.json

由 utoipa 从 handler/DTO 注解生成，与路由同源。

## 环境要求

| 工具 | 说明 |
|------|------|
| [Rust](https://www.rust-lang.org/) + MSVC | Windows 构建必需 |
| [bun](https://bun.sh/) | 前端依赖与脚本 |
| Node（建议 [fnm](https://github.com/Schniz/fnm)） | 部分工具链 |
| WebView2 | Win10/11 通常已自带 |

IDE：Cursor / VS Code + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-analyzer.rust-analyzer)

## 快速开始

```powershell
fnm use   # 若用 fnm 管理 Node
bun install
bun run tauri:dev
```

浏览器联调（两个终端）：

```powershell
bun run api:dev
bun run web:dev
```

## 常用命令

| 命令 | 作用 |
|------|------|
| `bun run tauri:dev` | 桌面开发（热更新，协议 IPC） |
| `bun run tauri:portable` | 便携 release exe（`--no-bundle`） |
| `bun run tauri:run` | 打包后立即启动 exe |
| `bun run tauri:installer` | NSIS 安装包 |
| `bun run tauri:clean` | 清 `src-tauri/target` |
| `bun run clean` | 清 `dist` + `src-tauri/target` |
| `bun run api:dev` | 本机 HTTP API + Scalar |
| `bun run api:test` | API 集成测试（临时 SQLite，不污染开发库） |
| `bun run web:dev` | 仅 Vite（需另开 `api:dev`） |

### 测试说明

`api:test` 用 axum `oneshot` + 临时库文件测 `app_router`（路由 → handlers → SQLite），不测 Tauri 窗口 / `appapi` 协议 / Scalar。

```powershell
bun run api:test
# 等价：cargo test --manifest-path src-tauri/Cargo.toml --test todos_api
```

## 便携版分发

产物：`src-tauri/target/release/tauri-app.exe`

纯净机**只需该 exe**；勿带 `*.pdb`、`.d`、`.cargo-*` 或其它 `target` 中间产物。

- 前端已嵌入；主路径不额外监听端口
- 目标机需 WebView2；NSIS 可在缺省时静默拉 bootstrapper，纯拷 exe 不会自动安装
- 窗口默认背景 `#2f2f2f`，减轻深色主题启动闪白
- 已开 Cargo `devtools`：便携/release 可用 **F12** 或 **Ctrl+Shift+I** 打开 WebView 开发者工具（正式上架前可关掉该 feature）

## 目录结构

```text
tauri-starter/
├── src/                      # 纯 React（无 Tauri SDK）
│   └── api/client.ts         # fetch 封装
├── src-tauri/
│   ├── src/
│   │   ├── api/              # axum 路由 + todos
│   │   │   ├── mod.rs        # app_router（无文档 UI）
│   │   │   ├── openapi.rs
│   │   │   ├── protocol.rs   # appapi → Router oneshot
│   │   │   ├── state.rs      # AppState / with_db_path
│   │   │   └── todos/        # handlers + SQLite store
│   │   ├── lib.rs            # 单例 + 注册 appapi
│   │   └── bin/api.rs        # HTTP 旁路 + Scalar
│   ├── tests/todos_api.rs    # API 集成测试
│   ├── tauri.conf.json
│   └── icons/
├── package.json
└── vite.config.ts
```

## 相关配置

- Windows 打包：`bundle.targets = ["nsis"]`（`src-tauri/tauri.conf.json`）
- 开发前端：`http://localhost:1420`
- 协议名：`appapi`
- 扩展路由：在 `app_router` 上 `.nest("/resource", …)`
