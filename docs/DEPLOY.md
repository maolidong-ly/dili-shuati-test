# 部署指南（Vercel + Supabase）

部署后学生用 **HTTPS 链接** 在任何网络打开，可添加到主屏幕；**口令 + 昵称** 换机续刷。

---

## 一、Supabase（约 10 分钟）

1. 打开 [supabase.com](https://supabase.com) 注册，**New project**（免费）。
2. 进入 **SQL Editor**，依次执行：
   - 项目内 `supabase/schema.sql`（全文）
   - 项目内 `supabase/cross-device-sync.sql`（全文）
3. 修改访问口令（班级统一口令）：

```sql
update public.app_secrets
set value = '你的班级口令'
where key = 'access_passphrase';
```

4. 打开 **Project Settings → API**，记下：
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> 不要把 `service_role` 密钥写进前端或 Vercel 环境变量。

---

## 二、代码推到 GitHub（首次）

在项目根目录：

```bash
git add .
git commit -m "准备部署高中地理刷题 PWA"
```

在 GitHub 新建空仓库，然后：

```bash
git remote add origin git@github.com:你的用户名/geo-quiz-pwa.git
git push -u origin main
```

（也可用 GitLab / Gitee，Vercel 同样支持导入。）

---

## 三、Vercel 部署

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录。
2. **Add New → Project**，导入 `geo-quiz-pwa` 仓库。
3. 框架应自动识别为 **Vite**，保持默认：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables** 添加（Production + Preview 都建议勾选）：

| 名称 | 值 |
|------|-----|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...`（anon 公钥） |

**不要** 在生产环境设置 `VITE_DEV_ACCESS_PASSPHRASE`。

5. 点击 **Deploy**，完成后得到形如 `https://geo-quiz-xxx.vercel.app` 的地址。

6. （可选）在 Vercel **Settings → Domains** 绑定你自己的域名，并确保 **HTTPS** 已开启。

---

## 四、给学生使用

- 发 **HTTPS 链接** + **班级口令**。
- **Android**：Chrome → 添加到主屏幕 / 安装应用。
- **iPhone**：Safari → 分享 → 添加到主屏幕。
- 每人自拟 **虚拟昵称**（2～16 字）；同一昵称可在新手机恢复进度（需 Supabase 已配置）。

---

## 五、更新题库 / 代码

推送到 GitHub 的 `main` 分支后，Vercel 会自动重新部署（约 1～2 分钟）。

本地验证生产构建：

```bash
npm run build
npm run preview
```

---

## 备选：Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect Git**。
2. 构建命令：`npm run build`，输出目录：`dist`。
3. 环境变量同上（`VITE_SUPABASE_*`）。
4. 保存并部署。

---

## 常见问题

**进门提示未配置云数据库**  
→ Vercel 环境变量未填或未重新 Deploy；变量名必须以 `VITE_` 开头。

**排行榜无数据**  
→ 需联网；学生刷题后会同步章节统计。

**换机没恢复进度**  
→ 确认已执行 `cross-device-sync.sql`；新设备必须用 **相同昵称 + 口令**。
