# 方案 1：Supabase + GitHub Pages（班级正式用）

按顺序做完后，学生用 **https://maolidong-ly.github.io/dili-shuati-test/** 进门（口令在 Supabase 里，**不要**写进 GitHub 代码）。

---

## 第 1 步：创建 Supabase 项目（约 5 分钟）

1. 打开 [https://supabase.com](https://supabase.com) → 用 GitHub 登录 → **New project**
2. 设数据库密码（自己保存），Region 可选 **Singapore** 或 **Tokyo**（国内访问略好一点，不保证）
3. 等项目状态变为 **Active**

---

## 第 2 步：执行 SQL（约 3 分钟）

1. 左侧 **SQL Editor** → **New query**
2. 打开本仓库文件 **`supabase/schema.sql`**，**全文复制** → 粘贴 → **Run**
3. 再新建一条 query，复制 **`supabase/cross-device-sync.sql`** 全文 → **Run**
4. 再 Run 下面这句（把口令改成你要发给学生的）：

```sql
update public.app_secrets
set value = '你的班级口令'
where key = 'access_passphrase';
```

5. （可选）改老师后台口令（用来以后在 SQL 里维护题目星级）：

```sql
update public.app_secrets
set value = '你的后台口令'
where key = 'admin_passphrase';
```

---

## 第 3 步：复制 API 密钥（约 1 分钟）

1. **Project Settings**（左下齿轮）→ **API**
2. 记下：
   - **Project URL**（形如 `https://xxxxx.supabase.co`）
   - **Project API keys** 里的 **anon** `public`（以 `eyJ` 开头）

**不要**把 `service_role` 密钥填进 GitHub 或前端。

---

## 第 4 步：写入 GitHub Actions 密钥（约 2 分钟）

1. 打开：  
   **https://github.com/maolidong-ly/dili-shuati-test/settings/secrets/actions**
2. **New repository secret**，添加两条（名称必须完全一致）：

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | 第 3 步的 Project URL |
| `VITE_SUPABASE_ANON_KEY` | 第 3 步的 anon public key |

**不要**添加 `VITE_DEV_ACCESS_PASSPHRASE`（生产不需要）。

---

## 第 5 步：重新发布网站（约 2 分钟）

1. 打开：  
   **https://github.com/maolidong-ly/dili-shuati-test/actions**
2. 左侧点 **Deploy GitHub Pages** → 右侧 **Run workflow** → 选分支 **main** → **Run workflow**
3. 等约 2 分钟变 **绿**

---

## 第 6 步：自测

1. 浏览器打开 **https://maolidong-ly.github.io/dili-shuati-test/**（建议无痕窗口，避免旧缓存）
2. 输入 **第 2 步设的班级口令** + 任意昵称（2～16 字）→ **开始刷题**
3. 不应再出现「未配置云数据库」
4. 换浏览器或手机，**同一昵称 + 口令** 应能恢复进度（需等刷题后同步）

---

## 常见问题

**仍提示未配置云数据库**  
→ Secrets 名称拼错、或 workflow 跑在加 Secret **之前**。加完 Secret 后必须 **再 Run workflow** 一次。

**访问口令不正确**  
→ Supabase 里 `access_passphrase` 与输入不一致；在 SQL Editor 再查：

```sql
select key, value from public.app_secrets where key = 'access_passphrase';
```

**Supabase 很慢或连不上**  
→ 学生弱网可能同步慢；进门验证一般仍能完成。长期可考虑国内备案托管（见 `docs/国内学生访问.md`）。

**Vercel 地址**  
→ 若仍部署在 Vercel，同样填上述两个 `VITE_*` 环境变量并 Redeploy；学生优先用 GitHub Pages 链接。
