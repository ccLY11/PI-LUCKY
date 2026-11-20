/**
 * Π 动嘉年华 · 全局配置
 * 部署到 GitHub Pages 前，把 Supabase 项目的 URL 与 anon key 填进来即可切换为云端模式。
 * 留空时自动进入「本地演示模式」：数据仅保存在当前浏览器，便于布展前预览。
 */
window.PI_CONFIG = {
  SUPABASE_URL: 'https://thwslciiboqxqhrvgcbs.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_bLtx8OPEyNKmLlwXVEO3tQ_bh2Xf5jY',

  // 事件盐值：参与幸运码位置计算，换一届活动改一次即可整体换号
  EVENT_SALT: 'SCAI-PI-2026',

  // 本地演示模式下的管理端密码（云端模式以数据库中的密码为准）
  DEMO_ADMIN_PASSWORD: 'pi2026'
};
