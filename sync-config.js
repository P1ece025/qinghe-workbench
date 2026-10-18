/**
 * 青禾工作台 · 云端同步配置（部署前填写一次，所有设备共用）
 *
 * 安全提示：本文件会随 GitHub Pages 公开，任何人都能查看这里的 Token。
 * 请务必使用一个专用 GitHub 账号，并只生成「仅 Gists 读写」权限的 Token，
 * 设置较短有效期；不要使用主账号的完整权限 Token，也不要在公开仓库放真实材料。
 *
 * 填写方法：
 * 1. token：GitHub → Settings → Developer settings → Personal access tokens
 *    → Fine-grained tokens → Account permissions → Gists: Read and write。
 * 2. gistId：通常留空即可。程序会在该账号下自动查找名为 qinghe-data.json 的
 *    云端备份；第一次上传时会自动创建。只有需要固定到某个 Gist 时才填写。
 * 3. autoPull：true = 打开网页时自动从云端拉取。
 */
window.QINGHE_SYNC = {
  token: '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',
  gistId: '21332279',
  autoPull: true
};
