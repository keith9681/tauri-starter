# tauri-starter

Tauri 2 + React + TypeScript 桌面待办应用（Windows 优先）。

前端 `src/` **不依赖** `@tauri-apps/*`；与 Rust 的通信在桌面侧走**自定义 URI 协议**（进程内处理，**不监听 TCP 端口**）。

## 技术栈

- **壳**：Tauri 2（窗口与自定义协议 `appapi`）
- **前端**：Vite 7 + React 19 + TypeScript（纯 Web）
- **包管理**：bun
- **打包**：便携 exe（`--no-bundle`）/ NSIS 安装包

## 架构

```text
src/  --fetch-->  http://appapi.localhost/todos...  --进程内-->  Rust 内存待办
                     （无 TCP listen）

可选浏览器联调：
src/  --fetch-->  http://127.0.0.1:8787/todos...   --TCP-->  cargo run --bin api
```

| 场景 | API Base | 是否占端口 |
|------|----------|------------|
| `tauri:dev` / 便携 exe | `http://appapi.localhost` | 否 |
| 纯浏览器 + `api:dev` | `http://127.0.0.1:8787` | 是（仅开发旁路） |

### 待办 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/todos` | 列表 |
| `POST` | `/todos` | 创建 `{ "title": "..." }` |
| `PATCH` | `/todos/:id` | 更新 `{ "title"?, "done"? }` |
| `DELETE` | `/todos/:id` | 删除 |

数据目前存在进程内存中，重启后清空。可用 `VITE_API_BASE` 覆盖默认地址。

## 环境要求

| 工具 | 说明 |
|------|------|
| [Rust](https://www.rust-lang.org/) + MSVC 工具链 | Windows 构建必需 |
| [bun](https://bun.sh/) | 前端依赖与脚本 |
| Node（建议经 [fnm](https://github.com/Schniz/fnm)） | 部分工具链会用到 |
| WebView2 | Win10/11 通常已自带 |

IDE 推荐：Cursor / VS Code + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 快速开始

```powershell
fnm use   # 若本机通过 fnm 管理 Node
bun install
bun run tauri:dev
```

## 常用命令

| 命令 | 作用 |
|------|------|
| `bun run tauri:dev` | 桌面开发（热更新，协议 IPC） |
| `bun run tauri:portable` | 打便携版 release exe（跳过安装包） |
| `bun run tauri:run` | portable 打包后立即启动 exe |
| `bun run tauri:installer` | 生成 NSIS 安装包 |
| `bun run tauri:clean` | 只清 `src-tauri/target` |
| `bun run clean` | 清 `dist` + `src-tauri/target` |
| `bun run api:dev` | 可选：本机 HTTP API（浏览器联调） |
| `bun run web:dev` | 可选：仅 Vite（需另开 `api:dev`） |

浏览器联调示例（两个终端）：

```powershell
bun run api:dev
bun run web:dev
```

## 便携版分发

产物路径：

```text
src-tauri/target/release/tauri-app.exe
```

拷到纯净 Windows 时**只需该 exe**。不要带：

- `*.pdb`（调试符号）
- `tauri-app.d`、`.cargo-*`
- `target` 下其它编译中间目录

说明：

- 前端资源已嵌入 exe；主路径 **不** 额外监听端口
- 目标机需有 WebView2；NSIS 安装包可在缺省时静默拉 bootstrapper，纯拷 exe 不会自动安装
- 窗口默认背景色为 `#2f2f2f`，减轻深色主题启动闪白

## 目录结构

```text
tauri-starter/
├── src/                    # 纯 React 前端（无 Tauri SDK）
│   └── api/client.ts       # fetch 封装
├── src-tauri/
│   ├── src/
│   │   ├── api.rs          # 待办业务 + 协议响应
│   │   ├── lib.rs          # 注册 appapi 协议
│   │   └── bin/api.rs      # 可选 HTTP 旁路
│   ├── tauri.conf.json
│   └── icons/
├── public/
├── package.json
└── vite.config.ts
```

## 相关配置

- Windows 打包目标：`bundle.targets = ["nsis"]`（见 `src-tauri/tauri.conf.json`）
- 开发前端地址：`http://localhost:1420`
- 自定义协议名：`appapi`
