# Π 动嘉年华 · 幸运码系统

学生填写姓名与学号，领取一段来自圆周率 π 的 4 位幸运码，并显示该码在 π 小数部分中的起始位数。每个学号只能领取一次；管理端提供实时统计与 Excel 导出。

- 学生端：`index.html`
- 管理端：`admin.html`（默认密码 `pi2026`）
- 纯静态页面，无构建步骤，可直接部署到 GitHub Pages
- 云端数据使用 Supabase（免费版即可）

## 目录结构

```
pi-lucky/
├─ index.html              学生领取页
├─ admin.html              管理端统计台
├─ css/style.css           全息终端主题样式
├─ js/
│  ├─ pi-digits.js         π 小数前 2000 位
│  ├─ config.js            Supabase 配置（部署前填写）
│  ├─ api.js               数据层：云端 RPC / 本地演示
│  ├─ claim.js             领取页逻辑
│  ├─ admin.js             管理端逻辑
│  ├─ bg.js                背景动画
│  └─ vendor/xlsx.full.min.js  Excel 导出
├─ supabase.sql            数据库初始化脚本
└─ README.md
```

## 一、配置 Supabase（约 5 分钟）

1. 打开 [supabase.com](https://supabase.com)，新建一个免费项目，等待初始化完成。
2. 左侧进入 **SQL Editor → New query**，把 `supabase.sql` 的全部内容粘贴进去并执行。
3. 左侧进入 **Project Settings → API**，复制：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` key
4. 打开 `js/config.js`，填入这两项：

```js
window.PI_CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
  EVENT_SALT: 'SCAI-PI-2026',
  DEMO_ADMIN_PASSWORD: 'pi2026'
};
```

5. 修改管理密码：在 SQL Editor 执行

```sql
update public.pi_admin_config set password = '你的新密码' where id = 1;
```

### 不配置也能预览

`config.js` 中的两项留空时，页面自动进入**本地演示模式**：数据写入浏览器 `localStorage`，功能完整（含统计与导出），但不同设备之间不共享。适合布展前预览效果。

## 二、部署到 GitHub Pages

1. 新建一个 GitHub 仓库，把 `pi-lucky` 目录内的全部文件上传到仓库根目录。
2. 仓库 **Settings → Pages**，Source 选择 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存。
3. 等待 1–2 分钟，访问 `https://<用户名>.github.io/<仓库名>/` 即为学生端。
4. 管理端地址为 `https://<用户名>.github.io/<仓库名>/admin.html`，现场可用二维码分发学生端链接。

页面内所有资源均为相对路径，仓库放在子路径下也能正常访问；无需 Node、无需构建。

## 三、幸运码规则

- 学号经哈希（含 `EVENT_SALT`）稳定映射到 π 小数部分的位置，从该位置起截取 4 位数字。
- 同一学号每次提交都得到同一个幸运码；页面会标注「该学号已领取」，并展示原幸运码，不会重复计数。
- 位置范围取自 π 小数前 2000 位（第 1–1997 位起）。
- 不同学号可能映射到同一段数字，属正常现象；如需要整体换号，修改 `EVENT_SALT` 即可（已领取的历史记录不受影响）。

## 四、管理端功能

- 密码登录（云端以数据库 `pi_admin_config` 为准，登录状态仅保存在当前标签页）
- 统计：领取总数、今日新增、唯一幸运码数、最近领取时间、24 小时领取时段分布
- 明细表：姓名 / 学号 / 幸运码 / π 位置 / 领取时间，支持关键词搜索
- 导出 Excel：`.xlsx`，含「领取明细」与「统计概览」两个工作表

## 五、安全说明

- `anon public` key 设计上可公开，数据安全由 Supabase 的行级安全（RLS）保证：两张表均已禁止前端直接读写，只开放 `pi_claim`、`pi_admin_list` 两个函数。
- 管理端密码通过函数校验，不会写入前端代码；但仍建议使用较复杂密码，并仅在活动期间分发管理端链接。
- 如需清空测试数据，可在 SQL Editor 执行 `truncate table public.pi_claims;`。
