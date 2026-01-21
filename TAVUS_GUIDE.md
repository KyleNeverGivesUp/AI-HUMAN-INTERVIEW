# 🎭 Tavus Persona API 完整使用指南

## 📚 目录
1. [Tavus 是什么](#tavus-是什么)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [API 使用方式](#api-使用方式)
5. [在本项目中使用](#在本项目中使用)
6. [常见问题](#常见问题)

---

## 🎯 Tavus 是什么

**Tavus** 是一个提供超逼真 AI 数字人的平台，专注于：

- 🎬 **实时对话数字人**（Conversational Video Interface）
- 🎥 **异步视频生成**（预录制视频）
- 🗣️ **高质量 TTS + 完美 Lip-Sync**（文字转语音 + 嘴型同步）
- 🤖 **可定制的 AI 个性**（Persona）

### 核心优势

| 特性 | 说明 |
|------|------|
| **Phoenix-3 模型** | 超逼真的面部渲染 |
| **低延迟** | < 1 秒响应时间 |
| **完美 Lip-Sync** | 嘴型与语音完美同步 |
| **情感控制** | 支持动态情感表达 |
| **身份一致性** | 保持数字人身份稳定 |

---

## 🚀 快速开始

### 步骤 1：注册并获取 API Key

1. **访问 Tavus 官网**
   ```
   https://www.tavus.io
   ```

2. **注册账号**
   - 可以用 Email 或 Google 账号注册
   - 可能需要信用卡（但有免费额度）

3. **获取 API Key**
   - 登录后进入 **Developer Portal**
   - 点击左侧 **"API Key"**
   - 点击 **"Create New Key"**
   - 复制并保存（无法重新查看）

   **API Key 格式：**
   ```
   tavus_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

### 步骤 2：选择 Replica（数字人头像）

Tavus 提供三种类型的 Replica：

#### A. Stock Replica（推荐新手）✅

**什么是 Stock Replica？**
- Tavus 预制的专业数字人
- 无需训练，即刻可用
- 涵盖多种场景（商务、教育、客服等）

**如何获取：**
1. 登录 Tavus Dashboard
2. 进入 **"Replica Library"**
3. 浏览可用的 Stock Replicas
4. 选择一个，复制 **Replica ID**

**Replica ID 格式：**
```
replica_xxxxxxxxxxxxxxxx
```

#### B. Personal Replica（个性化）

**需要：**
- 2 分钟的训练视频
- 清晰的面部特写
- 口头同意声明

**优点：**
- 完全定制化
- 可以是你自己或任何真人

#### C. AI-Generated Replica

**特点：**
- 完全 AI 生成
- 无需真人视频
- 适合虚拟角色

---

### 步骤 3：配置到项目

**编辑 `.env` 文件：**

```bash
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/backend

# 编辑 .env
nano .env
```

**添加 Tavus 配置：**

```bash
# Tavus Configuration
TAVUS_API_KEY=tavus_your_api_key_here
TAVUS_API_URL=https://tavusapi.com
```

**⚠️ 注意：** 保存后需要重启后端服务！

---

## 🏗️ 核心概念

### 1. Replica（数字人头像）

**定义：** 数字人的外观和视觉身份

```json
{
  "replica_id": "replica_abc123",
  "replica_name": "专业女性",
  "status": "ready",
  "thumbnail_url": "https://..."
}
```

### 2. Persona（AI 个性）

**定义：** 数字人的行为、语气、知识库

```json
{
  "persona_id": "persona_xyz789",
  "persona_name": "面试助手",
  "context": {
    "system_prompt": "你是一个友好的面试助手",
    "knowledge_base": "..."
  },
  "tts_config": {
    "engine": "cartesia",
    "voice_id": "voice_001",
    "emotion_control": true
  }
}
```

### 3. Conversation（对话会话）

**定义：** 实时交互的会话实例

```json
{
  "conversation_id": "conv_123456",
  "status": "active",
  "websocket_url": "wss://tavus.io/ws/conv_123456"
}
```

---

## 🎮 API 使用方式

Tavus 提供两种主要 API：

### 方式 A：实时对话（推荐用于面试场景）

#### 1. 创建会话

```bash
POST https://tavusapi.com/v2/conversations
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
Body:
{
  "persona_id": "persona_12345",          # 可选
  "replica_id": "replica_67890",          # 可选（至少提供一个）
  "conversation_name": "面试会话"
}
```

**响应：**
```json
{
  "conversation_id": "conv_abc123",
  "status": "active",
  "websocket_url": "wss://tavus.io/ws/conv_abc123",
  "access_token": "token_xyz"
}
```

#### 2. WebSocket 连接

```javascript
const ws = new WebSocket('wss://tavus.io/ws/conv_abc123');

// 监听连接
ws.onopen = () => {
  console.log('Connected to Tavus');
};

// 发送消息
ws.send(JSON.stringify({
  type: 'user_message',
  text: 'Hello, how are you?'
}));

// 接收响应
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'audio_chunk':
      // 播放音频
      playAudio(data.audio_data);
      break;
      
    case 'video_frame':
      // 显示视频帧
      renderVideo(data.video_data);
      break;
      
    case 'text_response':
      // 显示文字
      console.log(data.text);
      break;
  }
};
```

#### 3. 结束会话

```bash
DELETE https://tavusapi.com/v2/conversations/conv_abc123
Headers:
  x-api-key: YOUR_API_KEY
```

---

### 方式 B：异步视频生成（预录制）

适用于：欢迎视频、教程视频、固定内容

#### 1. 创建视频

```bash
POST https://tavusapi.com/v2/videos
Headers:
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
Body:
{
  "replica_id": "replica_67890",
  "script": "今天天气很好，有什么可以帮你的",
  "callback_url": "https://your-server.com/webhook"  # 可选
}
```

**响应：**
```json
{
  "video_id": "video_123",
  "status": "processing"
}
```

#### 2. 查询状态

```bash
GET https://tavusapi.com/v2/videos/video_123
Headers:
  x-api-key: YOUR_API_KEY
```

**响应（处理中）：**
```json
{
  "video_id": "video_123",
  "status": "processing",
  "progress": 45
}
```

**响应（完成）：**
```json
{
  "video_id": "video_123",
  "status": "ready",
  "hosted_url": "https://tavus.io/videos/video_123.mp4",
  "download_url": "https://cdn.tavus.io/video_123.mp4",
  "duration": 5.2,
  "thumbnail_url": "https://..."
}
```

---

## 💻 在本项目中使用

### 方案 1：完整版（真实数字人）

**需要：**
1. ✅ LiveKit API Keys（已配置）
2. ✅ Tavus API Key（需要填入）
3. ✅ Tavus Replica ID（需要选择）

**步骤：**

#### 1. 填入 Tavus API Key

```bash
# 编辑 backend/.env
TAVUS_API_KEY=tavus_your_key_here
TAVUS_API_URL=https://tavusapi.com
```

#### 2. 获取 Replica ID

登录 Tavus Dashboard → Replica Library → 复制 ID

#### 3. 重启后端

```bash
cd backend
# 停止后端（Ctrl+C）
source .venv/bin/activate
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. 测试

打开浏览器 → http://localhost:3000 → Mock Interview

---

### 方案 2：简化版（当前版本）

**特点：**
- ✅ 不需要 Tavus API Key
- ✅ 文字对话功能完整
- ❌ 没有真实视频/语音
- ❌ 只能回复 "hello"

**当前状态：**
```bash
后端已启动：http://localhost:8000
LiveKit：已配置 ✅
Tavus：未配置 ⚠️（可选）
```

---

## 🔄 与 LiveKit 集成

### LiveKit + Tavus 架构

```
┌─────────────┐
│  用户浏览器  │
└──────┬──────┘
       │ WebRTC
       ↓
┌─────────────┐
│   LiveKit   │ ← 负责实时音视频传输
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  后端服务器  │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────┐
│    Tavus    │ ← 负责生成数字人 + TTS
└─────────────┘
```

### 数据流

```
1. 用户输入文字 → 后端
2. 后端 → Tavus（生成语音 + 视频）
3. Tavus → 后端（返回音视频流）
4. 后端 → LiveKit（发布到 Room）
5. LiveKit → 用户（WebRTC 实时传输）
```

### 官方集成指南

LiveKit 提供了官方的 Tavus 集成文档：

```
https://docs.livekit.io/agents/integrations/avatar/tavus/
```

---

## 🎯 实战示例

### 示例 1：列出可用的 Replicas

```python
# 在 Python 中
from backend.src.services.tavus_service import tavus_service

replicas = await tavus_service.list_replicas()
for replica in replicas:
    print(f"ID: {replica['replica_id']}")
    print(f"Name: {replica['replica_name']}")
    print(f"Status: {replica['status']}")
    print("---")
```

### 示例 2：生成预录制视频

```python
# 生成视频
result = await tavus_service.generate_video(
    replica_id="replica_abc123",
    script="今天天气很好，有什么可以帮你的"
)

video_id = result['video_id']
print(f"Video ID: {video_id}")

# 等待几秒，然后查询状态
import asyncio
await asyncio.sleep(10)

status = await tavus_service.get_video_status(video_id)
if status['status'] == 'ready':
    print(f"Video URL: {status['hosted_url']}")
```

### 示例 3：创建实时对话

```python
# 创建会话
conversation = await tavus_service.create_conversation(
    replica_id="replica_abc123",
    conversation_name="面试测试"
)

print(f"Conversation ID: {conversation['conversation_id']}")
print(f"WebSocket URL: {conversation['websocket_url']}")

# 通过 WebSocket 连接（前端实现）
# 详见前端代码
```

---

## 🎨 TTS 配置选项

Tavus 支持多种 TTS 引擎：

### Cartesia（推荐）

```json
{
  "tts_config": {
    "engine": "cartesia",
    "voice_id": "voice_001",
    "emotion_control": true,
    "settings": {
      "speed": 1.0,
      "emotion": "neutral",
      "stability": 0.8
    }
  }
}
```

### ElevenLabs

```json
{
  "tts_config": {
    "engine": "elevenlabs",
    "voice_id": "your_elevenlabs_voice_id",
    "api_key": "your_elevenlabs_api_key",
    "settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }
}
```

---

## ❓ 常见问题

### Q1：Tavus 免费吗？

**A：** Tavus 通常提供免费试用额度，但具体取决于你的账号类型。

### Q2：我需要 Persona ID 还是 Replica ID？

**A：** 
- **Replica ID**：只想用默认的 AI 行为，只关心外观
- **Persona ID**：想定制 AI 的行为、语气、知识库
- **两者都提供**：最大程度定制化

### Q3：如何获得最好的 Lip-Sync？

**A：** 
1. 使用高质量的 TTS（Cartesia 或 ElevenLabs）
2. 确保音频清晰
3. 使用 Tavus 的情感控制功能
4. 选择质量高的 Replica

### Q4：实时对话的延迟是多少？

**A：** 通常 < 1 秒（包括 TTS 生成 + 视频渲染 + 网络传输）

### Q5：我可以自己训练 Replica 吗？

**A：** 可以！需要：
- 2 分钟的训练视频
- 清晰的面部特写
- 口头同意声明

---

## 📊 价格参考（仅供参考）

| 功能 | 免费额度 | 付费计划 |
|------|---------|---------|
| 视频生成 | 通常 10-100 次 | 按使用量计费 |
| 实时对话 | 通常限时/限次 | 按分钟计费 |
| Stock Replicas | ✅ 可用 | ✅ 可用 |
| Personal Replicas | ❌ 可能需要付费 | ✅ 可用 |

**官方定价：** https://www.tavus.io/pricing

---

## 🚀 下一步

### 立即行动

1️⃣ **注册 Tavus 账号**
   - 访问：https://www.tavus.io
   - 获取 API Key

2️⃣ **选择一个 Stock Replica**
   - 进入 Replica Library
   - 复制 Replica ID

3️⃣ **配置到项目**
   - 编辑 `backend/.env`
   - 填入 `TAVUS_API_KEY`

4️⃣ **重启后端**
   ```bash
   cd backend
   uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```

5️⃣ **测试完整功能**
   - http://localhost:3000
   - Mock Interview
   - 输入 "hello"
   - 看到数字人说话！✨

---

## 📖 相关资源

- **Tavus 官方文档**：https://docs.tavus.io
- **LiveKit + Tavus 集成**：https://docs.livekit.io/agents/integrations/avatar/tavus/
- **API 参考**：https://docs.tavus.io/api-reference/overview
- **社区支持**：https://discord.gg/tavus

---

**💡 提示：** 如果遇到任何问题，随时告诉我，我会立即帮你解决！🚀
