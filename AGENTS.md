# AGENTS.md

面向 AI / 协作者的**模板约定**。人类可读总览与「开新项目清单」见 [README.md](README.md)。

## 项目是什么

Windows 优先的 **Tauri 2 桌面应用模板**。示例业务是待办（Vite + React + TypeScript + **Astryx** 前端，Rust/axum 后端，SQLite）。本文件所在分支为 `template/astryx`；新桌面产品应复用本仓库的通信与持久化骨架，替换业务模块即可。

## 硬性约束（不要破坏）

1. **`src/` 禁止引入 `@tauri-apps/*`**。前端只通过 `fetch` 调 API（见 `src/api/client.ts`）。
2. **axum `app_router` 是唯一路由源**（`src-tauri/src/api/mod.rs`）。新业务在此挂载；桌面 `appapi` 与 `api:dev` 必须共用同一套 handlers。
3. **桌面主路径不监听 TCP**。进程内自定义协议 `appapi` → `dispatch_protocol` → Router oneshot。不要把「起 HTTP 服务」当成桌面默认方案。
4. **Scalar / OpenAPI UI 只挂在 `api` bin**（`src-tauri/src/bin/api.rs`），不要塞进 `app_router`。
5. **测试不要改全局 `TAURI_STARTER_HOME` 污染开发库**；用 `AppState::with_db_path(临时路径)`。
6. **桌面单例**：`tauri-plugin-single-instance`；重复启动激活已有窗口并退出第二进程。默认库 `{TAURI_STARTER_HOME|%LOCALAPPDATA%/<identifier>}/app_data.db`。
7. **Release / `tauri:run` 要能开 DevTools**：依赖 Cargo feature `devtools`（见 `src-tauri/Cargo.toml`）。正式商店分发前再评估是否关闭。

## 架构速查

```text
桌面：  src --fetch--> http://appapi.localhost --oneshot--> app_router --> SQLite
旁路：  src --fetch--> http://127.0.0.1:8787  --serve-->   同一 Router（+ Scalar）
```

| 路径 | 职责 |
|------|------|
| `src/api/client.ts` | API base 解析 + 业务客户端 |
| `src-tauri/src/api/mod.rs` | `app_router` / `shared_state` / 协议入口 |
| `src-tauri/src/api/protocol.rs` | HTTP Request ↔ oneshot |
| `src-tauri/src/api/state.rs` | `TAURI_STARTER_HOME` / `app_data.db` / `AppState` |
| `src-tauri/src/api/todos/` | **示例**业务（model / handlers / store），可整体替换 |
| `src-tauri/src/bin/api.rs` | 开发 HTTP + Scalar |
| `src-tauri/tests/todos_api.rs` | 集成测试（oneshot + tempfile） |
| `src-tauri/src/lib.rs` | 单例插件 + 注册 `appapi` |

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
| `bun run astryx …` | Astryx CLI（组件 / 模板 / tokens 文档） |

## 扩展指南

### 从模板派生新产品（必做对齐）

改身份时保持一致，否则数据目录会错位：

- `tauri.conf.json`：`productName` / `identifier` / 窗口 title
- `state.rs`：`APP_IDENTIFIER`（= `identifier`）、`HOME_ENV`、`DB_FILE_NAME`
- 包名与图标：`package.json`、`Cargo.toml`、`src-tauri/icons/`

### 新增 API 资源

1. 在 `src-tauri/src/api/<resource>/` 加 model、handlers、store（或复用现有模式）。
2. 在 `app_router` 上 `.nest("/...", routes())`。
3. 如需文档：utoipa 注解 + `openapi.rs` 的 `ApiDoc`；Scalar 仍只在 `api` bin。
4. 在 `src/api/client.ts`（或同层模块）加 `fetch` 封装；前端 UI 只依赖该客户端。
5. 在 `src-tauri/tests/` 用 oneshot + `AppState::with_db_path` 补集成测试。

### 持久化

- 默认库：`{TAURI_STARTER_HOME|%LOCALAPPDATA%/<identifier>}/app_data.db`。
- 环境变量：`TAURI_STARTER_HOME`（应用数据**目录**；库文件固定为该目录下 `app_data.db`）。测试优先 `with_db_path`。
- Store：`rusqlite` bundled；示例实现为 `SqliteTodoStore`。
- 桌面进程单例：`tauri-plugin-single-instance`（重复打开激活已有窗口）。

### 前端

- React 函数组件；与后端契约以 JSON API 为准（示例为 todos）。
- API base：`VITE_API_BASE` 可覆盖；否则桌面 `http://appapi.localhost`，浏览器 `http://127.0.0.1:8787`。
- **本分支（`template/astryx`）** 前端使用 [Astryx](https://astryx.atmeta.com/docs/getting-started)（`Theme` + `@astryxdesign/core/*`）；main 为朴素 React UI。

<!-- ASTRYX:START -->
Astryx v0.3.0 · 155 components
CLI: run every command as `bun run astryx <cmd>` or `bunx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";
  import "@astryxdesign/theme-neutral/theme.css";
  Wrap the tree in `<Theme theme={neutralTheme}>` (`@astryxdesign/theme-neutral/built`).

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   155 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->

## 明确不做（除非用户明确要求）

- 在前端重新引入 Tauri `invoke` / 插件 SDK 作为主通信方式
- 用 `axum-test` 或真实 TCP 端口做默认集成测试（oneshot 已够）
- 把 Scalar 打进便携桌面包
- 未确认就改打包目标、协议名、或提交无关大重构
- 把「起 TCP HTTP 服务」当成桌面默认运行方式

## 本地文件与 TSD

切换分支、`git checkout`、大批量读写等系统性文件操作后，部分文件可能被 **TSD** 加密。表现：磁盘内容以 `%TSD-Header-` 开头，编辑器/工具读成乱码或当作 binary，`StrReplace`/`Read` 失败。

用 **`decoy`** 解密后再编辑（一次只传一个路径，或不传参数解密当前目录）：

```powershell
decoy                 # 解密当前目录下已加密文件
decoy AGENTS.md       # 解密单个文件
decoy src             # 解密某个目录
```

若读写 Markdown / 源码异常，先跑 `decoy`，不要把加密后的二进制提交进仓库。

## 提交与文档

- 未明确要求时不要 `git commit` / `push`。
- 行为或命令变更时同步更新 `README.md`；本文件只保留 agent 约束与扩展路径，避免与 README 长文重复。
- 模板级约定变更（通信方式、HOME、单例、路由源）必须同时改 README「模板定位 / 用本模板开新项目」与本文件硬性约束。
