# 🎯 MVP 版本配置指南

## 目标

实现一个简单的数字人对话：
- 用户输入 "hello"
- 数字人说："今天天气很好，有什么可以帮你的"
- **显示真实的人脸视频**
- **播放真实的语音**

---

## 📋 需要的服务

### 1️⃣ LiveKit（音视频传输）

**免费方案：**

#### 选项 A：LiveKit Cloud（推荐）
1. 访问：https://cloud.livekit.io
2. 注册账号（免费）
3. 创建项目
4. 获取凭据：
   - API Key
   - API Secret  
   - WebSocket URL

#### 选项 B：本地部署
```bash
# 使用 Docker
docker run --rm -p 7880:7880 \
    -p 7881:7881 \
    -p 7882:7882/udp \
    -e LIVEKIT_KEYS="devkey: secret" \
    livekit/livekit-server:latest
```

---

### 2️⃣ Tavus（数字人生成）

**需要申请访问权限**

1. 访问：https://www.tavus.io
2. 注册账号
3. 申请 API 访问（可能需要等待审批）
4. 获取 API Key

**备注：** Tavus 可能需要商业账号或申请试用

---

## 🔧 配置步骤

### 步骤 1：创建 .env 文件

```bash
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/backend
cp env.example .env
```

### 步骤 2：编辑 .env 文件

```bash
# 使用你喜欢的编辑器
nano .env
# 或
code .env
```

填入你的 API Keys：

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# LiveKit Configuration (从 livekit.io 获取)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Tavus Configuration (从 tavus.io 获取)
TAVUS_API_KEY=tvs_xxxxxxxxxxxxxxxx
TAVUS_API_URL=https://tavusapi.com

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 步骤 3：重启后端

```bash
cd backend
source .venv/bin/activate

# 重启服务器
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🎬 测试流程

### 1. 打开页面
```
http://localhost:3000/digital-human
```

### 2. 点击 "Start Session"
- 后端会创建 LiveKit 房间
- 创建 Tavus 对话会话

### 3. 在右侧输入框输入 "hello"

### 4. 看到效果：
- 🎥 **视频区域**显示数字人头像
- 🔊 **听到语音**："今天天气很好，有什么可以帮你的"
- 👄 **嘴型同步**

---

## 🔄 备用方案：没有 API Keys 的情况

如果你暂时无法获取 API Keys，我可以创建一个**模拟版本**：

### 模拟版特点：
- ✅ 完整的输入框和聊天界面
- ✅ WebSocket 实时通信
- ✅ 显示固定文字回复
- ❌ 但没有真实的人脸视频
- ❌ 没有真实的语音

这个版本可以让你：
- 测试完整的前后端流程
- 验证所有 UI 交互
- 准备好后再集成真实的 API

---

## 🎯 你想选择哪个方案？

### 方案 A：完整版（需要 API Keys）
- 真实人脸视频 ✅
- 真实语音 ✅
- 唇形同步 ✅
- **需要：** LiveKit + Tavus API Keys

### 方案 B：模拟版（不需要 API Keys）
- 聊天界面 ✅
- 固定文字回复 ✅
- 完整流程测试 ✅
- **不需要：** 任何配置

---

## 💡 推荐流程

1. **先用模拟版**测试界面和交互
2. **申请 API Keys**（可能需要几天）
3. **配置真实 API**
4. **测试完整功能**

---

## 🆘 快速帮助

### 问题：看不到输入框？

**原因：** 输入框只在点击 "Start Session" 后显示

**解决：**
1. 访问 digital-human 页面
2. 点击紫色的 "Start Session" 按钮
3. 等待连接成功（看到欢迎消息）
4. 输入框出现在右侧聊天窗口底部

### 问题：点击 Start Session 报错？

**检查后端：**
```bash
curl http://localhost:8000/api/health
```

应该返回：
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "services": {
    "livekit": "not_configured",  // 或 "configured"
    "tavus": "not_configured"     // 或 "configured"
  }
}
```

---

## 📸 界面截图说明

### 连接前：
```
┌────────────────────────────────┐
│   [大视频区域]                  │
│                                │
│   💜 AI Digital Human Demo     │
│   这是简化版演示...             │
│                                │
│   [Start Session 按钮]         │  👈 点这里
│                                │
└────────────────────────────────┘
```

### 连接后：
```
┌──────────────────┬──────────────┐
│  [视频区域]       │ Conversation │
│                  │              │
│  AI 头像说话中... │ AI: 欢迎...  │
│                  │              │
│  [控制按钮]       │ You: hello   │
│                  │              │
│                  │ AI: 今天...  │
│                  │              │
│                  │ [输入框...]  │  👈 在这里输入
│                  │ [发送按钮]    │
└──────────────────┴──────────────┘
```

---

## ✅ 下一步

请告诉我：

1. **你有 API Keys 吗？**
   - 有 → 我帮你配置完整版
   - 没有 → 我先完善模拟版，你先测试界面

2. **你想先测试什么？**
   - 输入框功能
   - 完整的音视频功能
   - 其他特定功能

我会根据你的情况调整方案！🚀
