# 简历管理功能使用说明

## 功能概述

✅ 上传简历（PDF、Word）
✅ 查看简历列表
✅ 下载简历
✅ 删除简历
✅ 实时上传进度显示

## 技术实现

### 后端
- **数据库**: SQLite
- **文件存储**: 本地文件系统 (`backend/storage/resumes/`)
- **API框架**: FastAPI
- **ORM**: SQLAlchemy

### 前端
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **动画**: Framer Motion
- **HTTP客户端**: Axios

## 安装和启动

### 1. 安装后端依赖

```bash
cd backend
uv sync  # 或 pip install -e .
```

新增依赖：
- `sqlalchemy>=2.0.0` - ORM 框架

### 2. 启动后端

```bash
cd backend
python -m src.main
```

数据库会自动初始化，创建 `backend/src/resumes.db` 文件。

### 3. 启动前端

```bash
cd frontend
npm install  # 如果是首次运行
npm run dev
```

### 4. 访问页面

打开浏览器访问：`http://localhost:3000/resume`

## API 接口文档

### 上传简历
```
POST /api/resumes/upload
Content-Type: multipart/form-data

Body:
  file: File (PDF/Word)

Response:
  {
    "id": "uuid",
    "fileName": "uuid.pdf",
    "originalName": "我的简历.pdf",
    "fileSize": 123456,
    "fileType": "pdf",
    "status": "ready",
    "createdAt": "2026-01-29T00:00:00Z"
  }
```

### 获取简历列表
```
GET /api/resumes?page=1&limit=20

Response:
  {
    "total": 10,
    "items": [Resume...]
  }
```

### 下载简历
```
GET /api/resumes/{resume_id}/download

Response:
  File (application/octet-stream)
```

### 删除简历
```
DELETE /api/resumes/{resume_id}

Response:
  {
    "status": "success",
    "message": "简历已删除"
  }
```

## 文件结构

```
backend/
├── src/
│   ├── api/
│   │   └── resume_routes.py       # 简历 API 路由
│   ├── models/
│   │   ├── resume.py              # SQLAlchemy 模型
│   │   └── schemas.py             # Pydantic schemas
│   ├── database.py                # 数据库配置
│   └── resumes.db                 # SQLite 数据库（自动生成）
├── storage/
│   └── resumes/                   # 文件存储目录
│       ├── uuid-1.pdf
│       └── uuid-2.docx
└── pyproject.toml

frontend/
├── src/
│   ├── pages/
│   │   └── ResumeManager.tsx      # 简历管理页面
│   ├── components/
│   │   ├── ResumeUpload.tsx       # 上传组件
│   │   ├── ResumeCard.tsx         # 简历卡片
│   │   └── ResumeList.tsx         # 简历列表
│   ├── store/
│   │   └── useResumeStore.ts      # Zustand 状态管理
│   └── types/
│       └── index.ts               # TypeScript 类型定义
└── package.json
```

## 使用流程

### 1. 上传简历

1. 访问 `/resume` 页面
2. 点击上传区域或拖拽文件
3. 选择 PDF 或 Word 文件
4. 查看上传进度
5. 上传成功后自动显示在列表中

### 2. 管理简历

- **查看**: 简历自动按时间倒序排列
- **下载**: 点击"下载"按钮
- **删除**: 点击"删除"按钮并确认

## 限制说明

- **文件类型**: 仅支持 PDF (.pdf)、Word (.doc, .docx)
- **文件大小**: 最大 5MB
- **单次上传**: 一次只能上传一个文件
- **并发上传**: 支持多个文件同时上传

## 预留扩展

### 简历解析 (Placeholder)

数据库表中预留了 `parsed_data` 字段，用于存储简历解析结果：

```json
{
  "name": "张三",
  "email": "zhang@example.com",
  "phone": "138xxxx",
  "education": [...],
  "experience": [...],
  "skills": [...]
}
```

未来可以集成：
- PyPDF2 提取 PDF 文本
- python-docx 提取 Word 文本
- 正则表达式提取关键信息
- OpenAI API 智能解析

## 故障排查

### 后端错误

1. **数据库初始化失败**
   - 检查 `backend/src/` 目录是否可写
   - 查看日志：`backend/uvicorn.run.log`

2. **文件上传失败**
   - 检查 `backend/storage/resumes/` 目录是否存在
   - 检查磁盘空间

### 前端错误

1. **上传失败**
   - 打开浏览器控制台查看错误
   - 检查后端是否运行
   - 检查文件类型和大小

2. **CORS 错误**
   - 确认 `backend/.env` 中 `CORS_ORIGINS` 包含前端地址

## 安全提示

✅ 已实现:
- 文件类型白名单验证
- 文件大小限制
- UUID 文件名（防止路径遍历）
- 错误处理

⚠️ 生产环境需要:
- 用户认证和授权
- 病毒扫描
- 限流
- 文件加密存储
