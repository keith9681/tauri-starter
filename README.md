# tauri-starter

Windows 优先的 **Tauri 2 桌面应用模板**。用「待办」示范端到端骨架；新项目应在此基础上改名、换业务，而不是另起一套通信与持久化方式。

AI / 协作者约束见 [AGENTS.md](AGENTS.md)。

## 模板定位

| 要解决的问题 | 本模板的做法 |
|--------------|--------------|
| 前端如何调原生能力 | **不**走 `invoke`；`src/` 零 `@tauri-apps/*`，只用 `fetch` |
| 桌面如何调后端 | 自定义协议 `appapi` 进程内 oneshot → 同一套 axum Router（**默认不监听 TCP**） |
| 浏览器如何联调 | `api:dev` 旁路 HTTP + Scalar；与桌面共用 handlers |
| 数据放哪 | 用户本地目录 `{HOME}/app_data.db`，可用 `TAURI_STARTER_HOME` 覆盖目录 |
| 多开怎么办 | `tauri-plugin-single-instance`：二次启动激活已有窗口并退出 |
| 怎么发版 | 便携 exe（`--no-bundle`）或 NSIS；WebView2 运行时 |

示例业务（todos CRUD + SQLite）可替换；**架构约定应保留**。

## 技术栈

| 层 | 选型 |
|----|------|
| 壳 | Tauri 2（窗口 + `appapi` + 单例） |
| 前端 | Vite 8 + React 19 + TypeScript（纯 Web / `fetch`） |
| 后端 | axum（唯一路由源） |
| 持久化 | SQLite（`rusqlite` bundled） |
| API 文档 | utoipa + Scalar（仅 `api:dev`） |
| 包管理 / 打包 | bun；便携 exe 或 NSIS |

## 架构

```text
桌面：  src/ --fetch--> http://appapi.localhost/... --oneshot--> axum --> SQLite
开发旁路：src/ --fetch--> http://127.0.0.1:8787/...  --serve--> 同一 Router（+ Scalar）
```

| 场景 | API Base | 占端口 |
|------|----------|--------|
| `tauri:dev` / 便携 exe | `http://appapi.localhost` | 否 |
| 浏览器 + `api:dev` | `http://127.0.0.1:8787` | 是（开发旁路） |

可用 `VITE_API_BASE` 覆盖前端 API 地址。

### 持久化与单例

- 默认数据目录：`%LOCALAPPDATA%\com.wentongchen.tauri-app\`
- 默认库文件：该目录下 `app_data.db`
- 覆盖目录：环境变量 `TAURI_STARTER_HOME`（指**目录**，不是 db 文件路径）
- 桌面单例：重复启动 → 激活已有窗口 → 新进程退出
- 窗口默认居中（`tauri.conf.json` → `center: true`）

```powershell
$env:TAURI_STARTER_HOME = "D:\dev\tauri-starter-data"
bun run api:dev
```

### 示例 API（todos，可替换）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/todos` | 列表 |
| `POST` | `/todos` | 创建 `{ "title": "..." }` |
| `PATCH` | `/todos/:id` | 更新 `{ "title"?, "done"? }` |
| `DELETE` | `/todos/:id` | 删除 |
| `GET` | `/health` | 探活（库打开失败时 503 `db_error`） |

### API 文档（仅 `api:dev`）

桌面协议 / 便携包**不**挂载文档 UI。

- Scalar：http://127.0.0.1:8787/scalar
- OpenAPI JSON：http://127.0.0.1:8787/api-docs/openapi.json

## 用本模板开新项目

建议按顺序改，避免把示例标识带进正式产品：

1. **身份**：`src-tauri/tauri.conf.json` 的 `productName`、`identifier`、窗口 `title`；`package.json` / `Cargo.toml` 包名；图标 `src-tauri/icons/`
2. **数据目录**：[`state.rs`](src-tauri/src/api/state.rs) 中 `APP_IDENTIFIER`（须与 `identifier` 一致）、`HOME_ENV`（如改成你的产品前缀）、如需可改 `DB_FILE_NAME`
3. **业务**：用新资源替换 `src-tauri/src/api/todos/` 与前端；在 `app_router` 上 `.nest`；更新 `openapi.rs` 与 `src/api/client.ts`
4. **发版前**：评估是否关闭 Cargo `devtools`；确认 NSIS / 便携策略与 WebView2 说明

不要改的默认约定：前端无 Tauri SDK、桌面走 `appapi`、axum 为唯一路由源、Scalar 只挂 `api` bin、测试用 `with_db_path`。

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
- 窗口默认背景 `#2f2f2f`，减轻深色主题启动闪白；默认居中
- 已开 Cargo `devtools`：便携/release 可用 **F12** 或 **Ctrl+Shift+I** 打开 WebView 开发者工具（正式上架前可关掉该 feature）

## 目录结构

```text
tauri-starter/
├── src/                      # 纯 React（无 Tauri SDK）
│   └── api/client.ts         # fetch 封装
├── src-tauri/
│   ├── src/
│   │   ├── api/              # axum 路由 + 示例 todos
│   │   │   ├── mod.rs        # app_router（无文档 UI）
│   │   │   ├── openapi.rs
│   │   │   ├── protocol.rs   # appapi → Router oneshot
│   │   │   ├── state.rs      # HOME / app_data.db / AppState
│   │   │   └── todos/        # 示例业务（可替换）
│   │   ├── lib.rs            # 单例 + 注册 appapi
│   │   └── bin/api.rs        # HTTP 旁路 + Scalar
│   ├── tests/todos_api.rs    # API 集成测试
│   ├── tauri.conf.json
│   └── icons/
├── AGENTS.md                 # AI / 协作者硬性约定
├── package.json
└── vite.config.ts
```

## 相关配置

- Windows 打包：`bundle.targets = ["nsis"]`（`src-tauri/tauri.conf.json`）
- 开发前端：`http://localhost:1420`
- 协议名：`appapi`
- 扩展路由：在 `app_router` 上 `.nest("/resource", …)`
