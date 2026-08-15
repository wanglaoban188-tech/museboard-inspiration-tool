# Museboard 灵感搜集器

面向电商设计的“以图搜图 + 灵感库管理”工具。当前仓库包含一个可交互的产品原型，以及可直接扩展到生产环境的完整技术设计。

## 启动

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:3000`。

当前原型已实现：参考图上传/拖放、文字需求、搜索状态、结果瀑布流、筛选、批量选择、收藏、灵感库视图、图片 AI 分析详情弹窗、响应式布局和版权提醒。演示图片使用 Unsplash 公开图片链接；生产接入方式见 `ARCHITECTURE.md`。

已包含 `/api/search` 聚合搜索接口、统一 `SearchProvider` 契约、Unsplash 官方 API 示例适配器与 AI 分析数据结构。复制 `.env.example` 为 `.env.local` 并填入官方 API Key 后即可从接口获取真实结果。Google Lens、淘宝等未提供适用官方接口的平台不在服务端抓取。

## 推荐生产技术栈

- Web：Next.js 14、TypeScript、React Query、Tailwind 或 CSS Modules
- 图像/搜索服务：FastAPI、Celery/Arq、Redis
- 数据：PostgreSQL + pgvector；本地轻量版可用 SQLite
- 文件：开发环境本地目录；生产环境 S3、Cloudflare R2 或 MinIO
- 相似度：OpenCLIP/SigLIP embedding + pgvector HNSW
- 视觉分析：OpenAI Vision（可替换模型），输出严格 JSON Schema
- 搜索：只接官方 API、授权数据源、用户手动导入和合规浏览器扩展

## 合规原则

任何资产都必须保存来源 URL、来源站点、抓取/导入时间和授权备注。禁止绕过登录、验证码、robots、付费墙或下载保护；没有正式 API 的平台仅提供跳转搜索、浏览器扩展采集或手动导入。图片默认仅供灵感参考，商用前由用户确认版权。
