# Flowup 构建与合包优化方案

> 文档状态：Stabilization / 功能冻结
>
> 适用版本：Flowup 2.x
>
> 创建日期：2026-09-22
>
> 最后更新：2026-09-22
>
> 当前目标：不增加新的用户功能，优先把现有 `gen`、`build`、`assemble` 链路稳定到可持续发布状态。

## 1. 背景

Flowup 当前提供三条主要工作流：

- `flowup gen`：生成 Node-RED node 或 plugin 工程。
- `flowup build`：分别构建 runtime 和 editor 产物。
- `flowup assemble`：将多个 Flowup 包的 `dist/` 合并为一个可分发的 Node-RED npm 包。

当前主流程已经可以完成示例 node、plugin 的构建与合包，P0/P1 第一轮正确性改造也已落地。后续进入稳定化阶段：冻结命令和配置能力，不增加新的 CLI 功能，集中补齐回归测试、失败恢复、兼容矩阵、发布验证和文档一致性。

## 2. 第一轮审计基线

以下内容记录 2026-09-22 P0/P1 修复前的审计结果，用于保留问题背景；当前状态以 2.1 和 2.2 为准：

- CLI TypeScript 类型检查通过。
- `simple-node` runtime/editor 构建成功。
- `simple-plugin` runtime/editor 构建成功。
- 两个示例包可以被 `flowup assemble` 合并。
- 合并结果可以通过 `npm pack --dry-run`。
- 合包中的示例 node 可以被 Node-RED 5 扫描识别。
- 第一轮审计时，工作区 ESLint 检查存在 44 个错误。
- 第一轮审计时，仓库没有 build/assemble 自动化测试和测试脚本。
- 第一轮审计时，workspace 中的源码包被 Node-RED 自动扫描会因 `node-red` 入口指向源码根目录下不存在的构建文件而加载失败。

### 2.1 推进记录（2026-09-22）

P0/P1 第一轮实现状态：

- [x] FBA-001：输出路径使用 canonical path 双向重叠检查，删除前失败。
- [x] FBA-002：完整 build 和 assemble 使用 staging，成功后替换正式输出。
- [x] FBA-003：assemble 改为读取并校验 `dist/package.json`。
- [x] FBA-004：合包保留完整 entry 相对路径并拒绝路径穿越。
- [x] FBA-005：组件 resources 汇总到总包根目录命名空间，并重写静态文本引用及资源占位符。
- [x] FBA-006：采用包根发布模型，源码 Node-RED entries 指向 `dist/`，dist manifest 使用 dist 内相对路径。
- [x] FBA-007：完整 build 生成并校验 format version 1 的 `dist/flowup.manifest.json`。

已增加 Node 内置测试，覆盖路径重叠、staging 替换、artifact manifest 和路径穿越校验。S1-S3 和 S5 已于 2026-09-22 完成；S4 已提交兼容矩阵，等待 CI 在 Linux、macOS、Windows 和各 Node.js 版本上完成首次验证。

### 2.2 当前验证结果与剩余风险

当前已验证：

- CLI ESLint 零错误，TypeScript 类型检查通过。
- 24 项 build/assemble 单元断言和 1 项真实 Node-RED 集成测试通过。
- node、plugin 完整构建通过。
- 自动构建后合包及 `--skip-build` 合包通过。
- 已有 output 的 staging 替换和中断备份恢复通过。
- runtime、editor、第二个 package、复制、依赖冲突及 manifest 校验失败时，旧产物 hash 和文件清单保持不变。
- 多入口、嵌套入口、重复 entry、package filter、legacy/损坏 manifest 和 `--no-clean` 已有回归测试。
- 静态资源遍历会跳过符号链接，Windows drive、UNC 和反斜杠路径已有平台敏感测试。
- Node-RED 4.1.6 和 5.0.0 已在 macOS / Node.js 22.23.2 真实启动并通过 node、plugin、editor config、locales、icons 和 resources HTTP 验证。
- 已新增 Node.js 20.19/22/24、Linux/macOS/Windows、Node-RED 4.1.6/5.0.0 CI 矩阵。
- CLI、组件包和合包的真实 `npm pack`、tarball 文件清单及隔离安装验证通过。
- 已从空目录完成 `gen -> build -> assemble -> pack -> install -> Node-RED load` 端到端闭环。
- 根命令 `pnpm check` 已统一 lint、typecheck、build、unit、integration、示例检查和发布 E2E，并在本机全量通过。
- 生成包和合包已补齐 README、MIT LICENSE、非空描述、keywords 与发布文件清单。
- Node-RED 5 扫描 workspace 时不再出现源码根入口缺失错误。

当前剩余风险：

- Node.js 20/22/24 和 Linux/macOS/Windows 矩阵需要等待 GitHub Actions 首次跑通。
- Windows rename、长路径和符号链接权限差异仍需以 CI 结果确认。
- resources 引用重写目前针对静态 JS/CSS/HTML/JSON 文本，动态拼接 URL 仍需兼容性验证。
- `process.chdir` 仍是全局状态；当前 assemble 串行执行时安全，但程序化并发调用不应启用。

### 2.3 S1-S5 推进状态（2026-09-22）

- [x] S1：失败注入与产物不变性测试完成。
- [x] S2：合包边界、兼容 manifest、依赖及 `--no-clean` 回归完成。
- [x] S3：Node-RED 4/5 真实运行时资源和组件加载验证完成。
- [ ] S4：跨平台与支持矩阵配置完成，等待远程 CI 首次全部通过后关闭。
- [x] S5：发布门禁、真实 tarball 闭环和中英文文档收口完成。

## 3. 当前架构

### 3.1 Build 流程

```text
runtime/index.ts
  -> Vite runtime mode
  -> SSR/CommonJS
  -> dist/<scope>.js

client/index.ts + client/editor.html
  -> Vite editor mode
  -> IIFE + CSS 内联
  -> dist/<scope>.html

package.json + locales/icons/resources
  -> Vite plugins
  -> dist/package.json + 静态资源
```

完整构建会在 staging 目录中按 runtime、editor 顺序生成产物，写入并校验
`flowup.manifest.json` 后再替换 `dist`。单独执行 runtime/editor mode 仍属于开发模式，
不保证得到可发布的完整产物。

### 3.2 Assemble 流程

```text
扫描 workspace
  -> 识别包含 node-red 字段及 Flowup/Vite 配置的包
  -> 可选逐包执行事务化 flowup build
  -> 读取并校验 dist/package.json 和 flowup.manifest.json
  -> 在 staging 中复制组件并汇总 resources
  -> 合并 dist manifest 中的依赖和 node-red entries
  -> 写入并原子提交总包
```

## 4. 优化目标

### 4.1 必须达成

- assemble 不得删除或覆盖任何源码目录。
- 构建或合包失败时，上一份可用产物必须保持完整。
- 最终 manifest 必须来自实际构建产物，而不是对源码状态的猜测。
- Node-RED entries、HTML、locales、icons、resources 在单包和合包后都能正确工作。
- 所有显式选择的 package 都必须被找到，否则命令失败。
- 产物可以经过自动化的 `npm pack` 和 Node-RED 加载验证。
- build/assemble 核心行为有单元测试、集成测试和端到端测试。

### 4.2 尽量保持兼容

- 保留 `flowup build` 和 `flowup assemble` 命令名称。
- 保留现有 `flowup.config.ts` 基本结构。
- 现有简单 node/plugin 项目不修改源码即可继续构建。
- 对行为变化提供清晰错误信息和迁移说明。

### 4.3 稳定化期间明确冻结的事项

- 通用 npm 发布平台。
- 自动发布 npm registry。
- 替代 pnpm/npm 的 workspace 管理能力。
- 将任意非 Flowup Node-RED 包无损转换为 Flowup 包。
- 新增 `flowup verify`、`flowup pack` 等命令。
- 新增 watch、dev server、增量缓存和并行构建。
- 新增 `--json`、`--dry-run`、`--concurrency` 等选项。
- 扩展新的前端框架或新的包类型。

以上事项保留为后续候选，但在本轮稳定性验收完成前不进入开发。

## 5. 问题清单

本节保留最初审计问题和设计依据。实施状态以 2.1 节为准；已完成项仍需经过
Stage A/B 回归与兼容性验证后，才能视为发布级关闭。

### FBA-001：assemble 输出目录检查方向错误

优先级：P0

当前代码检查“源码包是否位于输出目录中”，但未正确检查“输出目录是否位于源码包中”。显式配置以下路径时，默认 clean 有机会递归删除源码：

```bash
flowup assemble --output packages/nodes/foo/runtime
```

改进要求：

- 使用 `realpath` 或等价规范化结果进行比较。
- 同时检查两个目录包含方向。
- 禁止 output 与源码包根目录、源码目录、源码 `dist` 发生重叠。
- 删除前再次验证目标目录。
- 错误信息必须包含 output、冲突 package 和冲突类型。

验收标准：

- output 位于任意源码包内时命令在执行 `rm` 前失败。
- output 是源码包祖先目录时命令失败。
- output 与源码 `dist` 相同或互相嵌套时命令失败。
- 符号链接无法绕过检查。

### FBA-002：构建与合包不是事务性的

优先级：P1

当前 assemble 会先删除最终输出，再执行构建和复制。如果中间失败，会丢失上一份有效合包或留下半成品。

目标流程：

```text
构建所有组件
  -> 校验所有组件产物
  -> 创建同文件系统 staging 目录
  -> 写入完整合包
  -> 校验合包
  -> 原子替换最终输出
```

建议 staging 路径：

```text
<output-parent>/.<output-name>.flowup-tmp-<random-id>
```

验收标准：

- 任一组件构建失败时，正式 output 不变。
- manifest 冲突、复制失败、校验失败时，正式 output 不变。
- 成功后不残留 staging 目录。
- 异常退出后的旧 staging 可被下次运行安全清理。

### FBA-003：assemble 使用源码 package.json 生成最终清单

优先级：P1

当前依赖和 `node-red` entries 取自源码 package.json，而发布内容来自 `dist`。这会导致以下信息不一致：

- `package.extra` 修改后的元数据。
- 构建阶段重写后的入口路径。
- 实际外置的 runtime 依赖。
- 构建插件新增的 metadata。

改进要求：

- build 完成后读取 `dist/package.json`。
- 对 `dist/package.json` 做 schema 和文件存在性校验。
- assemble 只使用构建产物 manifest 和 artifact manifest。
- 源码 package.json 仅用于 package 发现和开发阶段配置。

验收标准：

- 修改 `package.extra` 后，合包结果与 `dist/package.json` 一致。
- 源码 manifest 与 dist manifest 不一致时，以 dist 为准并给出诊断信息。

### FBA-004：Node-RED entry 路径被扁平化

优先级：P1

当前 assemble 对 entry 执行 `basename`，会把：

```text
nodes/foo/index.js
```

错误转换为：

```text
<target>/index.js
```

改进要求：

- 保留 entry 的完整相对路径。
- 入口必须是 POSIX 风格的包内相对路径。
- 拒绝绝对路径、空路径及包含 `..` 的路径。
- 合包后验证 `.js`/`.cjs` 文件存在。
- node 类型存在对应 HTML 时一并验证。

### FBA-005：合包后的 resources 不符合 Node-RED 资源规则

优先级：P1

Node-RED 只暴露安装模块根目录的 `resources/`。当前结构为：

```text
aggregate/<component>/resources/**
```

这些目录不会自动映射到总包的 `/resources/<module-name>/...`。

推荐采用物理合包模式，并统一输出：

```text
aggregate/
  components/<component-id>/**
  resources/<component-id>/**
```

客户端资源 URL 统一为：

```text
resources/<aggregate-package-name>/<component-id>/<asset-path>
```

由于组件单独构建时不知道最终 aggregate package name，需要引入以下方案之一：

1. 推荐：构建产物使用可识别占位符，assemble 时重写。
2. 由客户端 helper 在运行时读取构建注入的 module metadata。
3. 将资源 URL 定义为配置函数，由单包和合包分别注入 package name。

验收标准：

- 单包安装时 resources 可以访问。
- 合包安装时每个组件的 resources 可以访问。
- 两个组件中存在同名资源时不会覆盖。
- scoped npm package URL 正确。

参考：<https://nodered.org/docs/creating-nodes/resources>

### FBA-006：源码包与发布包的入口语义不一致

优先级：P1

源码 package.json 当前声明：

```json
{
  "node-red": {
    "nodes": {
      "foo": "foo.js"
    }
  }
}
```

但源码根目录没有 `foo.js`，文件只存在于 `dist/foo.js`。workspace link 或 `npm install <source-directory>` 后，Node-RED 会尝试加载不存在的文件。

当前已经确定采用从包根发布：

- 源码 package.json 的 `node-red` entry 指向 `dist/<entry>.js`。
- package root 使用 `files` 只发布 `dist`、README、LICENSE 等内容。
- 使用现有标准 `npm pack` / `npm publish`，不增加 Flowup 封装命令。
- dist 内可以保留一份供 assemble 使用的规范化 package.json，但不再要求用户直接进入 dist 发布。

仅发布 dist 的备选模型已经放弃。稳定化期间不再引入 `flowup pack`、`flowup publish` 或迁移命令，避免形成第二套发布入口。

### FBA-007：构建产物缺少稳定协议

优先级：P1

建议 build 新增：

```text
dist/flowup.manifest.json
```

建议第一版 schema：

```json
{
  "formatVersion": 1,
  "flowupVersion": "2.1.0",
  "package": {
    "name": "flowup-simple-node",
    "version": "1.0.0"
  },
  "nodeRed": {
    "nodes": {
      "simple-node": "simple-node.js"
    }
  },
  "assets": {
    "icons": ["icons/simple-node.svg"],
    "locales": ["locales/en-US/simple-node.json"],
    "resources": ["resources/banner.png"]
  },
  "runtime": {
    "format": "commonjs",
    "externalDependencies": []
  }
}
```

设计要求：

- 使用 `formatVersion` 管理协议兼容性。
- 所有路径相对 dist 根目录。
- build 负责生成，assemble 只消费。
- 未知的更高 `formatVersion` 必须明确失败。
- manifest 中声明的文件必须存在。

### FBA-008：依赖合并规则不足

优先级：P2

当前只允许依赖版本字符串完全相同。该行为安全但过于严格，例如 `^1.2.0` 与 `>=1.2 <2` 可能兼容，却会直接冲突。

建议分阶段处理：

第一阶段：

- 保留精确字符串冲突检测。
- 错误信息列出所有来源 package 和版本范围。
- 明确区分 dependencies、peerDependencies、optionalDependencies。
- 从 dist manifest 读取依赖。

第二阶段：

- 使用 semver 计算范围交集。
- 无交集时失败。
- 有交集时生成确定性范围，或要求根配置显式 override。
- 新增 `assemble.dependencyOverrides`。

同时需要校验 runtime bundle 中的 external import 是否存在于最终 dependencies/peerDependencies 中。

### FBA-009：package 元数据和发布内容不完整

优先级：P2

需要补齐或明确继承策略的字段包括：

- `repository`
- `homepage`
- `bugs`
- `funding`
- `engines`
- `files`
- `sideEffects`
- `node-red.version`
- `node-red.dependencies`
- `peerDependenciesMeta`
- `bundledDependencies`

还应：

- 复制 README 和 LICENSE。
- 使用准确的 `node-red` keyword。
- 校验 package name 和 semver version。
- 禁止 `package.extra` 覆盖 `type`、`main`、`node-red` 等关键字段，或对覆盖结果做最终验证。
- package.json 读取失败时立即失败，不得静默生成默认包。

参考：<https://nodered.org/docs/creating-nodes/packaging>

### FBA-010：package 扫描依赖递归遍历和字符串判断

优先级：P2

当前识别方式容易产生误判或漏判：

- 未真正使用 `pnpm-workspace.yaml` 的 package patterns。
- 配置文件通过是否包含 `@wry-smile/flowup` 字符串判断。
- 无效 JSON/config 被静默忽略。
- `--packages` 中不存在的值不会报错。

建议优先级：

1. `assemble.packages` 显式列表。
2. pnpm workspace package patterns。
3. 非 monorepo 下仅检查 cwd 和明确配置的子目录。

每个候选包应加载实际配置，并验证是否含 Flowup metadata。显式过滤项必须全部命中。

### FBA-011：Build 双阶段依赖顺序且缺少事务保护

优先级：P2

runtime 使用 `emptyOutDir: true`，editor 使用 `emptyOutDir: false`。因此顺序不可交换，并且：

- editor 失败时会留下仅有 runtime 的半成品。
- editor-only 构建可能复用旧 runtime 文件。
- runtime-only 构建不会产生完整 package.json。
- 用户配置可以覆盖关键 Vite build 字段，破坏 Flowup 不变量。

建议将一次完整 build 也改为 staging：

```text
.flowup/build/<id>/runtime
.flowup/build/<id>/editor
  -> 合并与验证
  -> 原子替换 dist
```

对 `outDir`、output format、entryFileNames、emptyOutDir 等关键字段，应禁止直接覆盖或在 merge 后执行不变量校验。

### FBA-012：程序化 API 使用全局 process.chdir

优先级：P3

`runBuild` 会临时修改全局 cwd。assemble 当前串行执行暂时不会触发问题，但外部调用者并行执行多个 `runBuild` 时可能互相干扰。

建议：

- 将 `root`、config path 和工作目录显式传给 Vite。
- 避免修改全局 cwd。
- 稳定化期间保持串行构建，并在程序化 API 的约束中明确不支持并发调用。
- 消除全局状态可以作为后续内部重构，但当前不以此引入并行构建能力。

### FBA-013：静态资源遍历缺少符号链接和文件类型保护

优先级：P3

当前同步递归使用 `statSync`，可能跟随目录符号链接，造成循环遍历或复制预期目录以外的内容。

建议：

- 使用 `lstat` 区分符号链接。
- 默认跳过符号链接，或要求显式允许。
- 仅复制常规文件。
- 验证所有最终路径仍位于资源根目录。
- 使用异步或受控并发 I/O。

## 6. 目标架构

### 6.1 Build

```text
读取并验证 Flowup config
  -> 创建 staging
  -> 构建 runtime
  -> 构建 editor
  -> 复制静态资源
  -> 生成 dist package.json
  -> 生成 flowup.manifest.json
  -> 校验入口、依赖和资源
  -> 原子替换 dist
```

### 6.2 Assemble

```text
解析显式 package inventory
  -> 构建组件或读取已有产物
  -> 读取每个 dist/flowup.manifest.json
  -> 校验协议版本和所有文件
  -> 计算目录、entry、resource 和依赖映射
  -> 写入 staging aggregate
  -> 生成总 package.json/README/LICENSE
  -> 校验 staging 内容
  -> 原子替换 output
```

### 6.3 建议模块边界

```text
cli/src/artifacts/
  schema.ts
  read.ts
  write.ts
  validate.ts

cli/src/package/
  manifest.ts
  dependencies.ts
  node-red.ts

cli/src/fs/
  safe-path.ts
  staging.ts
  atomic-replace.ts
```

模块名称可以按现有风格调整，但应把路径安全、artifact schema、依赖合并从 command 实现中拆出，便于单元测试。

## 7. CLI 稳定策略

稳定化期间不增加命令和选项，现有 CLI 行为按以下规则收敛：

### 7.1 `flowup build`

- `--mode all` 是唯一可发布构建模式。
- `--mode runtime|editor` 保留用于开发诊断，但文档必须明确产物不完整。
- 完整构建必须在 staging 中完成校验后替换 `dist`。
- 构建失败不得改变上一份有效 `dist`。
- 缺失配置、入口、HTML、package manifest 时必须给出确定性错误。

### 7.2 `flowup assemble`

- 默认串行构建，稳定化期间不引入并发。
- `--skip-build` 仍必须完整校验 `dist/package.json` 和 artifact manifest。
- `--no-clean` 需要补充回归测试，明确旧文件保留边界；在完成测试前不扩大其语义。
- 任何 package 选择错误、入口冲突、依赖冲突或资源复制失败，都不得替换旧 output。
- 默认输出和显式输出都必须经过相同的 canonical path 安全检查。

### 7.3 延期的 CLI 设想

以下能力本轮不实现：

- `flowup verify`
- `flowup pack`
- `--dry-run`
- `--json`
- `--concurrency`
- dependency override

本轮需要的验证直接作为 build/assemble 内部不变量和 CI 测试实现，避免扩大用户 API。

## 8. 稳定化实施计划

### Stage A：失败安全与回归闭环（已完成）

目标：证明失败不会破坏已有产物。

- [x] 注入 runtime 构建失败，断言旧 `dist` 不变。
- [x] 注入 editor 构建失败，断言旧 `dist` 不变。
- [x] 注入第二个 package 构建失败，断言旧 assemble output 不变。
- [x] 注入复制、manifest 校验和依赖冲突失败，断言 output 不变。
- [x] 覆盖中断后 backup 恢复和 stale staging 清理。
- [x] 覆盖 `--no-clean`，避免旧组件文件意外残留或覆盖新清单。
- [x] 覆盖缺失 package、损坏 JSON、未知 artifact format version。

完成标准：所有可控失败路径均有自动化断言，正式产物保持字节级不变。

### Stage B：兼容性与资源稳定

目标：证明当前功能在支持范围内行为一致。

- [x] 覆盖单 node、单 plugin、node + plugin 合包。
- [x] 覆盖多入口、嵌套入口、重复 entry name。
- [x] 覆盖普通包名和 scoped npm package 名。
- [x] 覆盖无依赖、runtime dependency、peer dependency、optional dependency。
- [x] 覆盖 resources 相对 URL、绝对 URL、占位符和同名资源。
- [x] 在 Node-RED 中验证 node、plugin、locales、icons 和 resources HTTP 访问。
- [ ] 覆盖 Node-RED 4、Node-RED 5 与项目声明支持的 Node.js LTS。
- [ ] 在 Linux、macOS、Windows CI 验证路径和 rename 行为。

完成标准：明确支持矩阵内不存在已知平台差异，合包资源请求返回正确内容。

### Stage C：发布与工程质量（本地闭环已完成）

目标：让当前功能具备可重复发布条件，不增加用户功能。

- [x] 清零发布门禁范围内的 CLI ESLint 错误。
- [x] 保持 typecheck、单元测试、集成测试全部通过。
- [x] 从空目录执行现有 `gen -> build -> assemble` 流程。
- [x] 对组件包、合包和 CLI 自身执行真实 `npm pack`。
- [x] 解包 tarball 后验证文件清单、入口和依赖。
- [x] 将 tarball 安装到隔离 Node-RED userDir 并验证加载。
- [x] 补齐 README、LICENSE、发布步骤、迁移说明和故障排查。
- [x] 生成本轮兼容性说明。
- [ ] 在准备正式版本号时生成对应 changelog。

完成标准：CI 可以只使用当前命令完成生成、构建、合包、打包、安装和加载闭环。

### 暂停区：稳定后再评估

- 并行构建。
- 增量缓存。
- watch/dev server。
- 新 CLI 命令和输出格式。
- 新框架、新组件类型和自动发布。

## 9. 测试计划

### 9.1 单元测试

至少覆盖：

- 安全路径判断。
- Windows/POSIX 路径归一化。
- entry path 校验和映射。
- package 名称清理及冲突处理。
- dependency merge 和冲突来源。
- config 优先级。
- package filter 全命中检查。
- artifact manifest schema/version。
- Node-RED manifest 生成。

### 9.2 集成测试 fixtures

建议建立：

```text
cli/test/fixtures/
  node-basic/
  node-multiple-entries/
  node-nested-entry/
  plugin-basic/
  node-with-runtime-dependency/
  node-with-resources/
  scoped-package/
  conflicting-dependencies/
  duplicate-node-entry/
  invalid-manifest/
```

每个 fixture 应使用真实 Vite 构建，不只 mock 文件系统。

### 9.3 端到端测试

流水线：

```text
flowup gen --non-interactive
  -> install/link 本地 CLI
  -> flowup build
  -> flowup assemble
  -> npm pack
  -> 安装到临时 Node-RED userDir
  -> 启动 registry/runtime
  -> 断言 node/plugin 被加载
  -> 请求 editor config/resources
```

端到端断言：

- runtime module 能被加载。
- editor HTML 能被读取。
- node 类型与 runtime/editor 注册名称一致。
- plugin runtime 和 editor 配置能被加载。
- locale namespace 正确。
- icons 可见。
- resources HTTP 路径返回 200。
- runtime dependency 可以 resolve。

### 9.4 失败注入测试

- 第二个 package 构建失败。
- 复制过程中抛错。
- 依赖冲突。
- output 已存在。
- staging 已存在。
- manifest 声明文件缺失。
- output 指向源码目录。
- 进程在原子替换前中断。

所有失败场景都应验证正式 output 未被破坏。

## 10. CI 质量门禁

建议根目录统一提供：

```json
{
  "scripts": {
    "lint": "...",
    "typecheck": "...",
    "test": "...",
    "test:integration": "...",
    "test:e2e": "...",
    "check": "..."
  }
}
```

PR 必须通过：

- lint。
- typecheck。
- unit tests。
- integration tests。
- 示例 node/plugin build。
- assemble fixture。
- npm pack dry-run。

release 必须额外通过：

- Node-RED E2E。
- CLI 自身 npm tarball 安装测试。
- 从已发布形态调用 `flowup gen/build/assemble`，避免只验证 workspace link。

## 11. 兼容与迁移策略

### 11.1 配置兼容

- 2.x 内保留现有 `scope`、`type`、`runtime`、`client`、`assemble` 字段。
- 稳定化期间不新增配置字段，也不改变现有字段默认值。
- 对危险的 Vite 覆盖先 warning，一个 minor 版本后再禁止。

### 11.2 Artifact Manifest 兼容

- 没有 manifest 的旧产物，在过渡版本中可以 fallback 到 `dist/package.json`，同时输出 deprecation warning。
- 新版 assemble 遇到更高 formatVersion 时必须失败，避免错误猜测。
- fallback 支持至少保留一个 minor 版本。

### 11.3 发布布局迁移

当前已确定采用包根发布：

- gen 模板将 `node-red` entries 改为 `dist/...`。
- build 生成的 dist package.json 仍使用 dist 内相对路径。
- assemble 读取 dist package.json，不受源码入口变化影响。
- 旧项目通过文档化步骤修改 package.json，本轮不新增迁移命令。

## 12. 可观测性与错误信息

每次 build/assemble 建议输出以下阶段：

```text
discover
build
validate
copy
manifest
verify
commit
```

错误对象应至少包含：

- 稳定错误码，例如 `FLOWUP_OUTPUT_OVERLAP`。
- 当前阶段。
- package 名称和路径。
- 相关配置字段。
- 建议修复方式。

程序化 API 不应直接 `process.exit`，而应抛出结构化错误；仅 CLI command 层设置 `process.exitCode = 1`。

## 13. 接下来建议的稳定化任务

以下顺序按风险和依赖关系排列，均不增加用户功能。

### PR S1：失败注入与产物不变性（已完成）

- 为 build 增加 runtime/editor 失败 fixture。
- 为 assemble 增加第二包失败、复制失败、依赖冲突 fixture。
- 对失败前后的 `dist`/output 建立文件清单和内容 hash 比较。
- 覆盖 backup 恢复、stale staging 清理和重复执行。

失败前后通过文件清单、大小和 SHA-256 比较正式产物，已覆盖构建、合包、复制、依赖冲突、manifest 及原子替换失败。

### PR S2：合包边界回归（已完成）

- 多入口和嵌套入口。
- 重复 node/plugin entry name。
- 显式 package 过滤全部命中与部分未命中。
- `--skip-build` 使用旧版 manifest、损坏 manifest 和未知 format version。
- `--no-clean` 的旧文件处理和重复合包。
- dependencies、peerDependencies、optionalDependencies 合并与冲突。

### PR S3：resources 与 Node-RED 集成验证（已完成）

- 普通包名和 scoped 包名。
- 相对 URL、带前导 `/` 的 URL、占位符以及动态引用限制。
- 同名 resources 的命名空间隔离。
- 启动真实 Node-RED，验证 editor config、locales、icons 和 resources HTTP 状态及内容。

如发现动态资源 URL 无法可靠重写，优先收紧文档约定和构建校验，不在稳定化阶段引入新的运行时 API。

### PR S4：跨平台与支持矩阵（CI 已配置，待首次全绿）

- Linux、macOS、Windows CI。
- 项目支持的 Node.js LTS。
- Node-RED 4 和 Node-RED 5。
- 路径分隔符、盘符、符号链接、rename 和长路径场景。

### PR S5：发布门禁和文档收口（已完成）

- 清零现有 ESLint 错误。
- 固化 typecheck、test、示例 build、assemble 和 npm pack 检查。
- 安装真实 tarball，而不是只使用 workspace link。
- 检查最终 tarball 文件清单、README、LICENSE、package metadata。
- 更新中英文使用说明、迁移步骤和故障排查。

已新增统一 `pnpm check` 门禁和真实发布 E2E。验证会安装 CLI tarball，在空目录
生成 node/plugin，执行构建、合包和三类 npm pack，再将组件 tarball 与合包 tarball
分别安装到隔离 Node-RED userDir 并验证加载与 HTTP resources。E2E 同时防止发布包
重新引入 `workspace:`/`catalog:` 协议或遗漏根目录 `resources/`。

## 14. Definition of Done

构建和合包优化完成需同时满足：

- [x] 不存在已知源码误删路径。
- [x] build 和 assemble 都使用 staging/atomic replace。
- [x] assemble 不再依赖源码 manifest 推断最终产物。
- [x] entries 保留完整相对路径并经过校验。
- [x] 单包和合包 resources 均可被 Node-RED 访问。
- [x] workspace 开发、npm pack、安装三种场景入口一致。
- [x] runtime dependencies 反映在 artifact manifest 和最终 package manifest。
- [x] README、LICENSE、Node-RED metadata 完整。
- [x] lint、typecheck、unit、integration、E2E 全部通过。
- [x] 示例 node 和 plugin 可以完成生成、构建、合包、安装、加载闭环。
- [x] 文档包含发布、迁移、故障排查说明。

稳定版本发布前，所有未完成项必须关闭；不得以增加新命令或跳过验证作为替代方案。

## 15. 相关资料

- Node-RED Packaging：<https://nodered.org/docs/creating-nodes/packaging>
- Node-RED Extra Resources：<https://nodered.org/docs/creating-nodes/resources>
- Node-RED Creating Nodes：<https://nodered.org/docs/creating-nodes/>
