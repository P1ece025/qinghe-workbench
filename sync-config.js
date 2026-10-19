/**
 * 青禾工作台 · 云端同步配置（已预填 Supabase，可直接使用）
 * anon key 是 Supabase 面向浏览器的公开密钥，按 RLS 策略只能读写
 * qinghe_workspace 一张表。请只放演示数据。
 * teacherInviteCode 是老师注册邀请码，可自行修改。
 */
window.QINGHE_SYNC = {
  supabaseUrl: 'https://cjbskxfuxxxfrarxauut.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqYnNreGZ1eHh4ZnJhcnhhdXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMDUzODEsImV4cCI6MjEwNzg4MTM4MX0.OqcfK-iV-vJbcbe5jv8O-PLmOjZGuj9K7VgGf3C9xvA',
  autoPull: true,
  teacherInviteCode: 'qinghe-teacher'
};
