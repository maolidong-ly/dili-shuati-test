# 地理刷题 PWA

面向约 100 人以内私域学生的地理选择题练习：网页 + PWA，安卓 / iOS 可「添加到主屏幕」当独立 App 使用。无手机号、仅虚拟昵称；题目与进度默认存本机，联网后同步匿名排行榜。

## 功能概览

- **PWA**：离线缓存静态资源，可安装到桌面
- **访问控制**：访问口令 + 云端最多 100 个昵称注册（见 `supabase/schema.sql`）
- **刷题**：章节选择题，本地记录进度与正确率
- **排行榜**：按章节的刷题数、正确率（正确率需至少 3 题）

## 本地开发

```bash
npm install
cp .env.example .env
# 未接 Supabase 时，在 .env 设置 VITE_DEV_ACCESS_PASSPHRASE 用于本地进门
npm run dev
```

## 昵称续刷（换机）

- **生产（Supabase）**：同一 **访问口令 + 虚拟昵称** 再次进入 → 自动识别老用户，从云端拉取 **刷题进度 + 错题本**，并继续同步排行榜。
- 执行 `supabase/cross-device-sync.sql`（或在全新库把它合并进 schema）。
- **本地 dev 未接 Supabase**：仅 **本机** 同昵称复用 id，**不能换手机续刷**。

## 部署（公网访问，不限局域网）

完整步骤见 **[docs/DEPLOY.md](docs/DEPLOY.md)**（Vercel + Supabase）。

概要：Supabase 执行 `schema.sql` + `cross-device-sync.sql` → GitHub 推代码 → Vercel 导入仓库并配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` → 将 HTTPS 链接发给学生。

## 刷题模式

- **按章节刷题**：人教版（2019）五册 → 章 → 节，目录见 `src/data/curriculum/pep2019.ts`
- **按考点刷题**：两级目录见 `src/data/curriculum/topics.ts`（自然地理 5 个考点；人文地理二级暂空）

题目分别录在各节的 `questions` 或各考点的 `questions` 数组中。

## 题目星级（老师后台）

- 题库字段可选 `stars: 1~5`（本地默认值）
- 上线后在 Supabase 表 `question_meta` 维护星级（覆盖本地），学生端联网自动同步
- 老师可在 SQL Editor 调用 `set_question_stars('后台口令', '题目id', 星级)` 逐题标注
- 刷题前在「练习设置」页可多选星级；未标星的题只在「不限星级」出现

## 错题本

- 答错自动收录，答对移出；数据仅存本机 `localStorage`
- 刷题页第三个 Tab「错题本」可重练全部或按单元重练

应用图标从桌面原图 **`资料库管理系统软件图标生成 (2).png`** 同步（不要用截图）。更新图标后执行：

```bash
npm run icons
```

源文件备份在 `public/app-icon-source.png`，页面与 PWA 使用压缩后的 `app-icon.png` / `pwa-*.png`。

## 学生安装

- **Android**：Chrome → 菜单 → 添加到主屏幕 / 安装应用
- **iOS**：Safari → 分享 → 添加到主屏幕
