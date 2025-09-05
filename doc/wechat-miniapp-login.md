## 微信小程序登录/注册前端调用说明

### 环境准备

- 后端环境变量需已配置并生效：
  - `WX_APPID`
  - `WX_SECRET`

### 接口概览

- 注册（不存在即创建，存在则仅更新资料与会话）
  - `POST /userBases/miniProgram/register`
- 登录（仅登录，未注册会报错）
  - `POST /userBases/miniProgram/login`
- 兼容旧接口（存在则登录，不存在自动注册）
  - `POST /userBases/miniProgramLogin`

### 请求体（统一）

```json
{
  "code": "wx.login 返回的 code",
  "nickname": "可选，昵称",
  "avatarUrl": "可选，头像地址",
  "gender": 0,
  "country": "可选",
  "province": "可选",
  "city": "可选",
  "language": "可选",
  "phoneNumber": "可选，建议脱敏/加密",
  "userId": 123
}
```

说明：

- `code` 必填，其余均为可选资料字段，传入则会写入/更新到 `user_wx` 表。
- `gender`：0 未知，1 男，2 女。
- `userId`：与主用户表打通时用于绑定（可选）。

### 响应体

```json
{
  "openid": "用户 openid",
  "session_key": "微信 session_key"
}
```

### 小程序示例代码

```ts
// 获取登录 code
wx.login({
  success: async (res) => {
    const code = res.code;
    // 可选：先从 wx.getUserProfile 或业务页面收集到的资料
    const profile = {
      nickname: '昵称',
      avatarUrl: 'https://...',
      gender: 0,
      country: 'China',
      province: 'Zhejiang',
      city: 'Hangzhou',
      language: 'zh_CN',
      phoneNumber: '138****0000',
      userId: 123,
    };

    // 选择调用：注册 / 登录 / 兼容接口
    const endpoint = 'https://你的服务域名/userBases/miniProgram/register';
    // const endpoint = 'https://你的服务域名/userBases/miniProgram/login';
    // const endpoint = 'https://你的服务域名/userBases/miniProgramLogin';

    wx.request({
      url: endpoint,
      method: 'POST',
      data: { code, ...profile },
      header: { 'Content-Type': 'application/json' },
      success: (resp) => {
        // 后端会有统一响应拦截包装的话，请按你的包装结构取值
        const data = resp.data?.data || resp.data; // 适配有统一包装或无包装
        const { openid, session_key } = data;
        // TODO: 根据业务需要处理 openid / session_key
      },
      fail: (err) => {
        console.error('login request failed:', err);
      },
    });
  },
  fail: (err) => {
    console.error('wx.login failed:', err);
  },
});
```

### 错误处理

- 若返回 `微信接口错误`，多为 `code` 过期/无效或服务端 `WX_APPID/WX_SECRET` 配置不正确。
- 未注册调用登录接口会返回 `用户不存在，请先注册`。

### 安全建议

- 不在前端长期存储 `session_key`；如需会话体系，请在后端结合 `openid` 自建会话/JWT。
- 资料字段如 `phoneNumber` 建议脱敏或加密存储，避免敏感数据泄露。

### 与主用户体系打通

- 请求体可携带 `userId` 以与 `users` 表绑定；也可按业务在注册成功后由后端自动创建主用户并回写 `userId`（需要后端再扩展）。
