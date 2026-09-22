# Flowup 构建与合包稳定化计划

> 状态：Stabilization / 功能冻结
>
> 适用版本：Flowup 2.x
>
> 最后更新：2026-09-22

本文档只记录当前实现、已经验证的稳定性约束和发布前剩余工作。已完成问题的原始审计过程、重复的修复建议，以及多入口、typed hooks 等新功能设计已移除；相关历史可通过 Git 追溯。

## 1. 当前目标

在不增加命令、配置项、框架或包类型的前提下，稳定以下现有工作流：

- `flowup gen`：生成 Node-RED node 或 plugin 工程。
- `flowup build`：构建 runtime、editor 和发布元数据。
- `flowup assemble`：把多个 Flowup 组件的发布产物合并为一个 Node-RED npm 包。

本阶段优先保证：路径安全、失败不破坏旧产物、产物协议一致、Node-RED 可加载、npm tarball 可发布，以及跨平台行为一致。

## 2. 已落地行为

### 2.1 Generator

- 名称必须是以字母开头的 kebab-case，只允许小写字母、数字和短横线。
- 在创建目录前拒绝空名称、路径穿越、路径分隔符和危险目标名。
- 先在同文件系统 staging 目录生成完整工程，再提交目标目录。
- 目标目录已存在时失败，不覆盖用户文件。
- 生成的 `.gitignore` 默认忽略 `node_modules/`、`dist/` 和 `.flowup/`。

### 2.2 Build

完整构建流程：

```text
读取并校验配置
  -> 生成不可变 BuildPlan
  -> 在 staging 中构建 runtime
  -> 在同一 staging 中构建 editor
  -> 写入 package.json 和静态资源
  -> 生成并校验 flowup.manifest.json
  -> 原子替换 dist
```

稳定性约束：

- `flowup build` 和 `flowup build --mode all` 是可发布构建。
- `--mode runtime` 与 `--mode editor` 仅供开发诊断，分别写入 `.flowup/runtime/` 和 `.flowup/editor/`，不会修改可发布的 `dist/`。
- runtime 与 editor 必须使用相同项目根目录和发布输出目录。
- 用户 Vite 配置不能绕过事务层管理的正式输出目录与清理策略。
- 配置中的相对路径基于配置文件所在目录解析。
- 程序化 API 不修改全局 `process.cwd()`。
- 构建失败时，上一份有效 `dist/` 保持不变。

发布产物包含：

- runtime CommonJS 入口。
- editor HTML 及内联的客户端入口 CSS。
- `package.json`。
- `flowup.manifest.json`，当前协议版本为 `formatVersion: 1`。
- `icons/`、`locales/` 和 `resources/` 中的普通文件；静态 resources CSS 保持独立文件。

### 2.3 Assemble

合包流程：

```text
发现并筛选组件
  -> 构建组件或校验已有 dist
  -> 读取 dist/package.json 和 flowup.manifest.json
  -> 计算 entry、resource 和 dependency 映射
  -> 在 staging 中生成合包
  -> 校验文件与 manifest
  -> 原子替换正式 output
```

稳定性约束：

- 输出路径使用 canonical path 做双向重叠检查，不能指向源码包、源码目录或其 `dist`。
- 组件目录名和所有目标路径在复制或删除前都必须通过边界检查。
- Node-RED entry 保留完整相对路径，不使用 `basename` 扁平化。
- `--skip-build` 仍会完整校验组件 artifact，不接受缺失、损坏或未知版本的 manifest。
- 显式 `--packages` 选择必须全部命中。
- dependency、peerDependency 和 optionalDependency 冲突会明确失败并报告来源。
- `workspace:`、`catalog:`、`file:`、`link:` 和 `portal:` 等不可发布依赖协议会在 artifact 校验阶段失败。
- resources 汇总到合包根目录的组件命名空间中，避免同名资源互相覆盖。
- 任一构建、复制、依赖合并或校验失败时，旧 output 保持不变。

### 2.4 文件系统事务

- 完整 build、assemble 和 gen 都使用同文件系统 staging + rename 提交。
- 正式输出替换期间使用短时锁，避免并发提交互相覆盖。
- 中断遗留的 backup 会在下一次操作时恢复。
- staging 只清理超过 24 小时的同目标遗留目录，避免删除仍在运行的任务。
- artifact 入口、HTML 和静态资源必须是 artifact 根目录内的普通文件；符号链接不会作为发布文件复制。

### 2.5 CLI 生命周期

- CLI 使用异步命令解析并等待 action 完成。
- command 层只设置 `process.exitCode`；核心 API 通过抛出错误报告失败，不直接退出进程。

## 3. 发布模型

Flowup 采用包根发布模型：

- 源码 `package.json` 中的 Node-RED entries 指向 `dist/...`。
- `files` 应包含 `dist`、根目录 `resources`、README 和 LICENSE。
- `npm pack` / `npm publish` 从包根执行。
- `dist/package.json` 是 assemble 消费的规范化产物清单，不是独立发布入口。
- 不发布 `.flowup/runtime` 或 `.flowup/editor` 中的 partial build。

升级 CLI 后应重新执行完整 `flowup build`。不要把旧 manifest 或 partial build 交给 `assemble --skip-build`。

## 4. 当前验证基线

本地 `pnpm check` 已覆盖并通过：

- ESLint 和 TypeScript typecheck。
- CLI 构建。
- 32 项 gen/build/assemble 单元断言。
- 1 项真实 Node-RED 集成测试。
- 示例 node、plugin 的 build、assemble 和 pack。
- 从空目录执行真实 CLI tarball 的 `gen -> build -> assemble -> pack -> install -> Node-RED load`。
- 组件包、合包和 CLI tarball 的文件清单、入口、依赖及根目录 resources。
- Node-RED 4.1.6 与 5.0.0 在 macOS / Node.js 22.23.2 下的 runtime、plugin、editor config、locales、icons 和 resources HTTP 验证。

关键失败回归已覆盖：

- runtime 或 editor 构建失败。
- 第二个组件构建失败。
- 复制失败、依赖冲突、manifest 损坏或声明文件缺失。
- output 已存在、backup 恢复和 stale staging 清理。
- 多入口、嵌套入口、重复 entry、package filter 和 `--no-clean`。
- Windows drive、UNC、反斜杠、符号链接和路径逃逸。

上述失败场景均检查正式 `dist` 或 assemble output 的文件清单与内容 hash 不变。

## 5. 未关闭风险

### S4：跨平台矩阵首次验证

CI 已配置以下矩阵，但仍需等待远程运行全部通过后关闭：

- Node.js 20.19、22、24。
- Linux、macOS、Windows。
- Node-RED 4.1.6、5.0.0。

重点观察 Windows rename、长路径、盘符、符号链接权限，以及异常中断后的锁和 backup 恢复。

### 动态 resources URL

静态 JS、CSS、HTML 和 JSON 文本引用已有重写与集成验证。运行时动态拼接的资源 URL 无法仅靠静态处理完整证明，当前策略是：

- 保持现有静态资源约定，不新增运行时 API。
- 在文档和示例中使用可静态识别的 URL。
- 发现不兼容时优先增加校验、错误说明和回归用例。

### 正式发布准备

- 发布候选版本前再次运行完整 `pnpm check`。
- 确认 GitHub Actions 支持矩阵全绿。
- 使用准备发布的版本号生成 changelog。
- 对最终 CLI tarball 再执行一次隔离安装验证。

## 6. 稳定化范围

在当前稳定化完成前，不推进以下工作：

- 新 CLI 命令或新的输出格式。
- 多入口新配置模型或 typed hooks。
- dependency override 或自动 semver 范围合并。
- 并行构建、增量缓存、watch 或 dev server。
- 新前端框架、新包类型或自动发布。

现有配置和行为只接受兼容性修复、错误诊断改进、测试补强和必要的内部重构。

## 7. Definition of Done

- [x] gen、完整 build 和 assemble 都使用安全的 staging 提交。
- [x] build 和 assemble 失败不会破坏上一份正式产物。
- [x] assemble 只消费经过校验的构建产物协议。
- [x] entries、HTML、locales、icons 和 resources 在单包及合包中可用。
- [x] workspace、npm tarball 和安装后的 Node-RED 入口语义一致。
- [x] 非发布依赖协议、路径逃逸和符号链接发布文件会被拒绝。
- [x] lint、typecheck、unit、integration、示例和发布 E2E 在本地通过。
- [x] 中英文 README 包含构建、发布、迁移和故障排查说明。
- [ ] Node.js、操作系统和 Node-RED 远程 CI 矩阵首次全部通过。
- [ ] 正式版本 changelog 与最终 tarball 验证完成。

## 8. 相关资料

- [Node-RED Packaging](https://nodered.org/docs/creating-nodes/packaging)
- [Node-RED Extra Resources](https://nodered.org/docs/creating-nodes/resources)
- [Node-RED Creating Nodes](https://nodered.org/docs/creating-nodes/)
