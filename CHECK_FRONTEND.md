# 🔍 前端显示问题诊断

## 你应该看到的界面

### 在 http://localhost:3000 (JobNova 首页)

```
+------------------+--------------------------------------------+
| 【左侧边栏】      |          【主内容区】                        |
|                  |                                            |
| 🟣 JobNova      |   JobNova - Job Board                      |
|                  |                                            |
| ✓ Jobs          |   [Matched] [Liked] [Applied]              |
| □ AI Mock...    |                                            |
| □ Digital Human |   🔍 Search jobs...                        |
| □ Resume        |                                            |
| □ Profile       |   [Job Card 1] - 64% Match                 |
| □ Setting       |   [Job Card 2] - 93% Match                 |
| □ Subscription  |   [Job Card 3] - 82% Match                 |
| □ Extra Credits |                                            |
|                  |                                            |
| [Upgrade Plan]  |                                            |
+------------------+--------------------------------------------+
```

**关键点：**
- ✅ **左侧**应该有紫色的侧边栏（宽度约 256px）
- ✅ 侧边栏顶部显示 "JobNova" logo
- ✅ 可以看到 8 个菜单项
- ✅ 其中第 3 个是 "Digital Human" 🤖

---

## 🚨 如果看不到侧边栏

### 症状 1：页面是空白的
**原因**：JavaScript 加载失败

**解决方案**：
1. 打开 Chrome 开发者工具：`Cmd + Option + I` (Mac) 或 `F12` (Windows)
2. 查看 Console 标签是否有红色错误
3. 刷新页面：`Cmd + Shift + R`

### 症状 2：只看到白色背景，没有任何内容
**原因**：CSS 未加载或 React 未挂载

**解决方案**：
1. 检查开发者工具 Console
2. 重启前端服务器（见下方）

### 症状 3：页面显示但没有侧边栏
**原因**：组件渲染问题

**解决方案**：
1. 清除浏览器缓存：Chrome 设置 → 隐私和安全 → 清除浏览数据
2. 或使用隐私模式：`Cmd + Shift + N`

---

## 🔧 重启前端服务器

如果以上都不行，重启前端：

```bash
# 终止现有进程
lsof -ti:3000 | xargs kill -9

# 重新启动
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/frontend
npm run dev
```

等待看到：
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:3000/
```

然后访问：http://localhost:3000

---

## 📱 备用访问方式

直接访问这些 URL（不需要点击侧边栏）：

1. **JobNova 首页**：
   ```
   http://localhost:3000
   ```

2. **Digital Human（数字人）**：
   ```
   http://localhost:3000/digital-human
   ```

3. **Job Detail（职位详情）**：
   ```
   http://localhost:3000/job/1
   ```

---

## 🎯 数字人页面应该长这样

```
+--------------------------------------------------------+
|              AI Digital Human                          |
|    Real-time conversation with AI-powered digital human|
+--------------------------------------------------------+
|                                                        |
|  +------------------+     +--------------------+      |
|  |                  |     | Conversation       |      |
|  |   【视频区域】    |     |                    |      |
|  |                  |     | [Chat messages]    |      |
|  |  [Start Session] |     |                    |      |
|  |                  |     |                    |      |
|  |                  |     | [Type message...] |      |
|  +------------------+     +--------------------+      |
|                                                        |
|  [Real-Time Video] [Natural Voice] [Low Latency]      |
+--------------------------------------------------------+
```

---

## ✅ 快速测试清单

在 Chrome 浏览器中：

- [ ] 访问 http://localhost:3000
- [ ] 能看到左侧紫色侧边栏
- [ ] 侧边栏显示 "JobNova" logo
- [ ] 能看到 8 个菜单项
- [ ] 点击 "Digital Human" 跳转成功
- [ ] 或直接访问 http://localhost:3000/digital-human

---

## 🆘 还是不行？

### 检查浏览器兼容性
- Chrome 版本需要 90+
- 确保 JavaScript 已启用
- 禁用可能干扰的浏览器插件

### 检查网络
```bash
curl http://localhost:3000
```
应该返回 HTML 内容

### 查看终端日志
前端服务器终端应该没有错误信息

---

## 📞 调试命令

```bash
# 测试前端服务器
curl -I http://localhost:3000

# 测试后端服务器
curl http://localhost:8000/api/health

# 查看端口占用
lsof -i :3000
lsof -i :8000
```

---

现在尝试这些方法，如果还有问题请告诉我！
