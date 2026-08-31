# 雀帐小程序

正式小程序代码位于此目录，使用微信云开发（CloudBase）保存局、成员和点数划转。

## CloudBase 初始化

1. 在微信开发者工具中导入 `SRC`，开通一个云开发环境。
2. 在 [app.js](app.js) 中将 `YOUR_CLOUDBASE_ENV_ID` 替换为该环境 ID。
3. 右键 `cloudfunctions/game`，选择“上传并部署：云端安装依赖”。
4. 在云开发控制台创建集合 `games` 与 `transfers`。云函数使用服务端权限，两个集合不需要向客户端开放读写权限。

`games` 嵌入最多五名成员；`transfers` 一笔划转一条记录。划转有 `pending`、`confirmed`、`rejected`、`expired` 四种状态，待确认记录在两分钟后由后续轮询自动标记超时。

微信小程序不提供可取得微信好友 ID 的通用好友选择器。因此发起人通过原生微信分享发送邀请码，好友由分享链接或邀请码加入，成员身份仍以 CloudBase 自动注入的 `openid` 校验。