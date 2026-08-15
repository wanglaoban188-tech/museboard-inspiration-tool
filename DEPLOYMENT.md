# Museboard 外部部署说明（Vercel / Netlify / Railway / Render）

## 推荐方案：Vercel

适合当前 Next.js 项目，部署最快。

### 方法 A：GitHub + Vercel

1. 新建一个 GitHub 仓库，例如 `museboard-inspiration-tool`。
2. 把本项目文件上传到 GitHub。
3. 打开 https://vercel.com/ 并登录。
4. 点击 `Add New Project`。
5. 选择刚才的 GitHub 仓库。
6. Framework 选择 `Next.js`。
7. Build Command 使用：`npm run build`。
8. 点击 Deploy。
9. 部署完成后会得到一个正式网址，例如：

   `https://museboard-inspiration-tool.vercel.app`

10. 打开 Chrome 扩展 Museboard，填写这个正式网址并保存。

## 注意：云端持久化

当前 Vercel 快速部署版可以正常打开网页和使用基础功能，但如果要多人共享同一个灵感库，建议继续接入云数据库，例如：

- Vercel Postgres
- Supabase
- Neon
- Railway PostgreSQL

原因：浏览器本地保存只属于当前浏览器；服务器文件保存不适合 Vercel Serverless 长期持久化。

## Netlify

也可以部署，但 Next.js API 路由和图片采集接口兼容性需要额外适配。优先推荐 Vercel。

## Railway / Render

适合需要长期运行 Node 服务、文件存储或数据库的版本。后续如果要做团队共享灵感库，Railway + PostgreSQL 是比较稳的组合。

## 插件设置

部署后：

1. 重新加载 `browser-extension` 插件。
2. 打开插件弹窗。
3. 在 `Museboard 网址` 输入正式网址，例如：

   `https://museboard-inspiration-tool.vercel.app`

4. 点击保存。
5. 再去 Pinterest / Amazon / 花瓣 / Instagram 采集图片。
