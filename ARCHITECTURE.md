# 产品与技术方案

## 1. 产品定位与范围

Museboard 服务于电商设计师的完整灵感链路：参考图与自然语言输入 → 多来源候选发现 → 统一筛选与去重 → 收藏与下载 → AI 分析 → 长期可检索的灵感库。

首版 MVP 聚焦五条主流程：

1. 上传参考图并输入“同款、不同颜色、场景、用途”等补充需求。
2. 并行调用已启用的合规搜索源，标准化结果并排序。
3. 按来源、相似度、图片类型、颜色、风格、场景和用途筛选。
4. 批量收藏；保留出处，计算文件哈希与视觉向量，阻止重复保存。
5. AI 自动输出中英标签、构图、设计参考点和生图提示词。

不在 MVP 中直接实现未经授权的网站抓取。Google Lens、Yandex、Pinterest、淘宝、1688、亚马逊等没有适用官方接口时，以“打开对应搜索页 + 用户确认采集”“浏览器扩展手动保存”或合作数据接口实现。

## 2. 功能模块

### 搜索工作台

- 上传、粘贴或拖放参考图，校验 MIME、大小、像素和安全性。
- 文字意图解析为 `product/color/style/scene/shot_type/usage/negative_terms`。
- 搜索策略自动拆成：视觉相似、语义同类、同风格、同场景四路。
- 来源适配器并行执行，超时与失败不会阻塞其他来源。
- 结果标准化、pHash 去重、向量重排，展示来源与相似度解释。

### 灵感库

- 项目、类目、合集、标签四种互补组织方式，不强迫图片只属于一个文件夹。
- 收藏、备注、星标、批量编辑、相似图查找、来源追溯。
- ZIP 导出内含图片与 `sources.csv`，每条记录保留来源和授权状态。
- 原图不可下载时，只收藏缩略图与源页面链接。

### AI 分析

- 快速层：主色、尺寸、pHash、embedding。
- 深度层：视觉模型结构化分析；结果带模型版本、置信度，可人工修正。
- 标签词表由管理员维护同义词，例如“奶油风 / cream aesthetic”。

### 来源与插件管理

每个来源实现统一接口：`search(context) -> NormalizedResult[]`、`health()`、`capabilities()`。能力声明包含视觉搜索、文字搜索、商用授权筛选、原图下载、速率限制。配置和密钥只在服务端保存。

推荐首批来源：Bing Visual Search/Azure（若账号仍可用对应服务）、Unsplash API、Pexels API、用户上传、手动 URL 导入。具体服务可用性和条款在上线时逐项复核。

## 3. 系统结构

```text
Next.js Web
  ├─ 搜索工作台 / 灵感库 / 图片详情 / 项目管理
  └─ BFF（会话、签名上传、任务状态）
          │
FastAPI API
  ├─ Search Orchestrator ── Source Adapters
  ├─ Asset Service ──────── S3 / MinIO
  ├─ AI Analysis ────────── Vision Provider
  ├─ Similarity Service ─── OpenCLIP / pgvector
  └─ Export Service ─────── ZIP + sources.csv
          │
PostgreSQL + pgvector / Redis Queue
```

耗时任务（下载、embedding、AI 分析、ZIP）全部进入队列。搜索 API 立即返回 `search_id`，前端通过 SSE 获取增量结果。

## 4. 数据库设计

### 核心表

`users`
- `id uuid PK`, `email`, `name`, `created_at`

`projects`
- `id uuid PK`, `user_id FK`, `name`, `product_category`, `description`, `created_at`

`collections`
- `id uuid PK`, `project_id FK nullable`, `user_id FK`, `name`, `parent_id FK nullable`

`assets`
- `id uuid PK`, `user_id FK`, `storage_key`, `thumbnail_key`
- `mime_type`, `width`, `height`, `byte_size`
- `sha256 unique nullable`, `phash bigint`, `embedding vector(768)`
- `title`, `note`, `favorite boolean`, `download_status`
- `source_url`, `source_page_url`, `source_site`, `license_name`, `license_url`
- `imported_at`, `created_at`, `deleted_at`

`asset_analysis`
- `asset_id PK/FK`, `model`, `model_version`, `language`
- `product_types jsonb`, `image_types jsonb`, `styles jsonb`, `scenes jsonb`
- `uses jsonb`, `colors jsonb`, `composition jsonb`
- `design_notes text`, `prompt_zh text`, `prompt_en text`
- `raw_response jsonb`, `confidence numeric`, `analyzed_at`

`tags`
- `id uuid PK`, `canonical_name`, `name_zh`, `name_en`, `type`, `aliases jsonb`

`asset_tags`
- `asset_id FK`, `tag_id FK`, `source` (`ai|user|rule`), `confidence`, PK `(asset_id, tag_id)`

`collection_assets`
- `collection_id FK`, `asset_id FK`, `position`, `added_at`, PK `(collection_id, asset_id)`

`searches`
- `id uuid PK`, `user_id FK`, `reference_asset_id FK`, `query`
- `parsed_intent jsonb`, `status`, `source_config jsonb`, `created_at`, `finished_at`

`search_results`
- `id uuid PK`, `search_id FK`, `provider`, `provider_item_id`
- `thumbnail_url`, `source_page_url`, `original_url`
- `width`, `height`, `visual_score`, `semantic_score`, `final_score`
- `tags jsonb`, `license_info jsonb`, `raw jsonb`
- unique `(search_id, provider, provider_item_id)`

`export_jobs`
- `id uuid PK`, `user_id FK`, `status`, `storage_key`, `manifest_key`, `expires_at`

`source_connectors`
- `id`, `user_id`, `provider`, `enabled`, `encrypted_config`, `capabilities`, `last_health_at`

索引：`assets USING hnsw (embedding vector_cosine_ops)`、`assets(phash)`、`assets(user_id, created_at)`、`GIN` 用于 JSONB 标签和全文检索。所有业务查询必须按 `user_id` 隔离。

## 5. 排序与去重

精确重复使用 SHA-256；视觉近重复先以 64-bit pHash 汉明距离 `<= 6` 召回，再用 embedding 余弦相似度确认。默认 `>= 0.97` 视为近重复，`0.90–0.97` 提示“高度相似”但允许保留。

搜索综合分：

`final = 0.50 * visual + 0.25 * text_image + 0.15 * intent_match + 0.10 * quality`

缺失维度时重新归一化，绝不把来源自己的“相关度”直接伪装成跨来源统一相似度。UI 应显示“综合匹配”，详情中解释评分构成。

## 6. 文件与文件夹逻辑

对象存储路径仅用于技术管理：

`users/{userId}/projects/{projectId|inbox}/{yyyy}/{mm}/{assetId}/original.ext`

用户看到的项目、产品类目、风格、场景来自数据库，不随自动分类结果移动物理文件，避免改标签引发迁移。导出时再按：

`项目/产品类目/图片类型/文件名.ext`

并生成 `sources.csv`、`metadata.json`、`README-COPYRIGHT.txt`。

## 7. API 设计

### 上传与资产

- `POST /v1/uploads/presign` 获取签名上传地址
- `POST /v1/assets` 完成入库并触发分析
- `POST /v1/assets/import` 手动 URL 导入（先校验 robots/类型/大小/权限）
- `GET /v1/assets` 标签、颜色、场景、用途、向量等筛选
- `GET /v1/assets/{id}` 详情
- `PATCH /v1/assets/{id}` 修改标题、备注、收藏和人工标签
- `DELETE /v1/assets/{id}` 软删除
- `POST /v1/assets/{id}/similar` 库内相似图
- `POST /v1/assets/batch` 批量移动、打标签、收藏

### 搜索

- `POST /v1/searches` 创建聚合搜索
- `GET /v1/searches/{id}` 状态与分页结果
- `GET /v1/searches/{id}/events` SSE 增量结果
- `POST /v1/searches/{id}/more` 分来源加载更多
- `POST /v1/searches/{id}/save` 批量收藏选定结果

请求示例：

```json
{
  "reference_asset_id": "uuid",
  "query": "找高级品牌感的女士钱包场景图",
  "modes": ["similar", "style", "product", "scene"],
  "providers": ["unsplash", "pexels", "bing"],
  "filters": {"min_width": 1200, "license": ["commercial", "unknown"]}
}
```

### 分类与导出

- `GET/POST/PATCH /v1/projects`
- `GET/POST/PATCH /v1/collections`
- `GET /v1/tags/suggest?q=`
- `POST /v1/exports` 创建 ZIP 任务
- `GET /v1/exports/{id}` 获取状态和临时下载地址

### 插件

- `GET /v1/connectors` 来源能力与健康状态
- `PATCH /v1/connectors/{provider}` 启停与配置
- `POST /v1/connectors/{provider}/test` 测试连接

## 8. 页面结构

- `/search`：上传区、需求输入、来源选择、瀑布流、筛选栏、批量操作。
- `/library`：项目/合集侧栏、标签与颜色筛选、图库、批量编辑。
- `/assets/[id]`：大图、来源、授权、AI 分析、相似图片、修改历史。
- `/projects/[id]`：项目概览、类目与用途统计、最近收藏。
- `/settings/connectors`：来源、密钥、限流和连接测试。

移动端保留搜索、收藏和浏览；批量整理优先桌面端。

## 9. 开发步骤

### 阶段 A：可用 MVP（2–3 周）

1. 账号、项目、上传、对象存储和资产 CRUD。
2. Unsplash/Pexels 官方 API 适配器与手动 URL 导入。
3. 搜索结果标准模型、SSE、基础筛选与批量收藏。
4. SHA-256/pHash 去重、颜色提取、OpenCLIP 向量。
5. 灵感库、来源追溯和 ZIP + CSV 导出。

### 阶段 B：AI 与检索（2 周）

1. 视觉模型 JSON Schema、标签词表、人工修正。
2. pgvector 相似搜索与融合排序。
3. 中英文搜索、颜色/场景/构图/用途组合筛选。
4. 队列重试、调用预算、缓存与可观测性。

### 阶段 C：来源扩展（持续）

1. 对每个来源单独完成 API 可用性、地区、配额和条款审核。
2. 接入可授权的视觉搜索 API。
3. 开发用户主动操作的浏览器扩展，用于“保存当前图片及来源”，不自动爬站。
4. 团队协作、权限、共享合集与审计日志。

## 10. 安全、合规与验收

- 服务端下载防 SSRF：禁止私网/回环/非 HTTP(S)，DNS 重绑定复核，限制跳转、类型、尺寸与超时。
- 上传进行 MIME 魔数校验、图片解码重写和恶意内容扫描。
- API 密钥加密保存，日志与 AI 请求不记录原图签名 URL。
- 来源站点、页面 URL、授权信息不可被批量编辑为空。
- 对 unknown license 明显标记“仅供参考”；导出时再次提醒。
- 搜索适配器遵循各来源速率限制与缓存规定，可随时停用。

核心验收指标：首批结果时间 < 3 秒（有缓存时）、保存重复拦截率 > 95%、每个收藏资产来源完整率 100%、AI 标签可人工覆盖、单一来源故障不影响整体搜索完成。
