# 🎯 Job Matching Feature - 职位智能匹配功能

## 功能概述

基于大语言模型（LLM）的智能简历-职位匹配系统，使用 Anthropic Claude 分析简历与职位的匹配度。

### 核心功能

- ✅ **3个真实职位数据**（T-Mobile、Blizzard、Alo Yoga实习岗位）
- ✅ **LLM 智能匹配**：使用 Claude 分析简历与JD的匹配度
- ✅ **详细分析报告**：
  - 匹配分数（0-100）
  - 匹配的技能列表
  - 缺失的技能列表
  - 候选人优势
  - 能力差距
  - 改进建议
- ✅ **职位管理**：查看、喜欢、申请职位
- ✅ **签证信息**：H1B、CPT、OPT 赞助状态

---

## 架构设计

```
┌─────────────────────────────────────────────────────┐
│  前端 (React + TypeScript + Zustand)                 │
│  - JobBoard 页面                                     │
│  - JobList 组件                                      │
│  - useJobStore (状态管理)                            │
└────────────────┬────────────────────────────────────┘
                 ↓ HTTP API
┌─────────────────────────────────────────────────────┐
│  后端 (FastAPI + SQLAlchemy + SQLite)                │
│  - /api/jobs - 职位列表                              │
│  - /api/jobs/seed - 初始化数据                       │
│  - /api/jobs/match/{resume_id} - 匹配分析           │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  LLM 服务 (Anthropic Claude)                         │
│  - resume_matcher.py                                 │
│  - 分析简历与JD的匹配度                               │
│  - 提供详细的结构化分析                               │
└─────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 启动后端服务器

```bash
cd backend
uv run uvicorn src.main:app --reload
```

服务器将在 `http://localhost:8000` 运行。

### 2. 初始化职位数据

在**新的终端窗口**中运行：

```bash
cd backend
uv run python seed_jobs.py
```

你应该看到：
```
✅ Successfully seeded jobs:
  - Associate Software Engineer Intern at T-Mobile
  - Localization Intern at Blizzard Entertainment
  - Digital Engineering Intern at Alo Yoga
```

### 3. 启动前端

在**另一个终端窗口**中：

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 运行。

### 4. 测试功能

#### 步骤 1: 查看职位列表
- 打开浏览器访问 `http://localhost:5173`
- 点击侧边栏的 **"Jobs"**
- 你应该看到 3 个真实的实习职位

#### 步骤 2: 上传简历
- 点击侧边栏的 **"Resume"**
- 上传你的简历（PDF 或 Word）
- 等待上传完成

#### 步骤 3: 执行智能匹配
使用 API 测试工具（Postman、curl 或浏览器）：

```bash
# 假设你的简历 ID 是从上传响应中获得的
curl -X POST http://localhost:8000/api/jobs/match/YOUR_RESUME_ID
```

或者在浏览器控制台中（在前端页面）：

```javascript
// 1. 获取简历 ID
fetch('/api/resumes')
  .then(r => r.json())
  .then(data => console.log('Resume ID:', data.items[0]?.id));

// 2. 执行匹配（替换 YOUR_RESUME_ID）
fetch('/api/jobs/match/YOUR_RESUME_ID', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('Match Results:', data));
```

#### 步骤 4: 查看匹配结果
匹配完成后，刷新职位列表，你将看到：
- 每个职位的匹配度百分比（0-100%）
- 职位按匹配度排序

---

## API 文档

### 1. 获取职位列表

```http
GET /api/jobs
```

**响应示例：**
```json
{
  "total": 3,
  "jobs": [
    {
      "id": "tmobile-associate-swe-intern-2026",
      "title": "Associate Software Engineer Intern",
      "company": "T-Mobile",
      "location": "Philadelphia, PA",
      "matchPercentage": 85.5,
      "sponsorsCPT": true,
      "skills": ["Java", "Python", "JavaScript"]
    }
  ]
}
```

### 2. 初始化职位数据

```http
POST /api/jobs/seed
```

**响应：**
```json
{
  "message": "Successfully seeded 3 job postings",
  "jobs": [...]
}
```

### 3. 匹配简历到职位

```http
POST /api/jobs/match/{resume_id}
```

**响应示例：**
```json
{
  "resumeId": "abc123",
  "totalJobs": 3,
  "matches": [
    {
      "jobId": "tmobile-associate-swe-intern-2026",
      "jobTitle": "Associate Software Engineer Intern",
      "jobCompany": "T-Mobile",
      "matchScore": 85,
      "matchedSkills": ["Python", "JavaScript", "Java"],
      "missingSkills": ["Agile", "CI/CD"],
      "strengths": [
        "Strong programming fundamentals in Python and JavaScript",
        "Experience with web development projects",
        "Good understanding of data structures and algorithms"
      ],
      "gaps": [
        "Limited experience with Agile methodologies",
        "No mention of CI/CD pipeline experience"
      ],
      "recommendations": [
        "Learn about Agile development practices",
        "Gain experience with CI/CD tools like Jenkins or GitHub Actions"
      ]
    }
  ]
}
```

### 4. 获取详细匹配分析

```http
GET /api/jobs/{job_id}/match-analysis/{resume_id}
```

**响应：**包含单个职位的详细匹配分析。

### 5. 喜欢/取消喜欢职位

```http
POST /api/jobs/{job_id}/like
```

### 6. 申请职位

```http
POST /api/jobs/{job_id}/apply
```

---

## 职位数据详情

### T-Mobile - Associate Software Engineer Intern
- **地点**: Philadelphia, PA
- **薪资**: $26-47/hour
- **时长**: 11周
- **技能**: Java, Python, JavaScript, TypeScript
- **签证**: CPT ✅, 不赞助工作签证 ❌

### Blizzard Entertainment - Localization Intern
- **地点**: Irvine, CA
- **薪资**: $20-50/hour
- **时长**: 12周
- **技能**: Python, C++, Java, SQL
- **签证**: CPT ✅, OPT ✅

### Alo Yoga - Digital Engineering Intern
- **地点**: San Ramon, CA
- **薪资**: $45-50/hour
- **时长**: 8周（6月8日-7月31日）
- **技能**: Java, Python, AWS, Distributed Systems
- **签证**: CPT ✅, OPT ✅

---

## LLM 匹配工作原理

### Prompt 设计

系统将以下信息发送给 Claude：

```
简历内容 + 职位描述 + 职位要求 + 职位职责

要求返回 JSON 格式的结构化分析：
- matchScore: 匹配度分数（0-100）
- matchedSkills: 匹配的技能
- missingSkills: 缺失的技能
- strengths: 优势（3-5点）
- gaps: 差距（2-3点）
- recommendations: 改进建议（2-3点）
```

### 匹配标准

Claude 会综合考虑：
- ✅ 技术技能匹配度
- ✅ 经验水平对齐
- ✅ 相关项目/工作经验
- ✅ 教育背景要求
- ✅ 软技能和文化契合度

### 成本估算

- 每次匹配分析：约 $0.01-0.02
- 3个职位完整分析：约 $0.03-0.06
- 使用国内代理可能成本更低

---

## 文件结构

```
backend/
├── src/
│   ├── models/
│   │   └── job.py              # 职位数据库模型
│   ├── api/
│   │   └── job_routes.py       # 职位 API 路由
│   ├── services/
│   │   └── resume_matcher.py   # LLM 匹配服务
│   └── database.py             # 数据库配置
├── seed_jobs.py                # 初始化职位脚本
└── resumes.db                  # SQLite 数据库

frontend/
├── src/
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   ├── store/
│   │   └── useJobStore.ts      # 职位状态管理
│   ├── pages/
│   │   └── JobBoard.tsx        # 职位列表页面
│   └── components/
│       ├── JobList.tsx         # 职位列表组件
│       └── JobCard.tsx         # 职位卡片组件
```

---

## 故障排查

### 问题 1: "Database already has X jobs"
**解决方案**：数据已初始化，无需重复seed。如需重置：

```bash
rm backend/resumes.db
uv run python -c "from src.database import init_db; init_db()"
uv run python seed_jobs.py
```

### 问题 2: "Failed to match resume to jobs"
**可能原因**：
- Anthropic API key 未配置或无效
- 简历内容为空

**检查**：
```bash
# 检查环境变量
cat backend/.env | grep ANTHROPIC

# 测试 API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### 问题 3: "Resume has no parsed data"
**解决方案**：上传简历时确保文件包含文本内容。目前 parsedData 可能需要手动提取。

---

## 下一步改进

### Phase 1: 完成基础功能 ✅
- [x] 职位数据库模型
- [x] LLM 匹配服务
- [x] API 端点
- [x] 前端集成

### Phase 2: 增强功能（待开发）
- [ ] 自动提取简历文本（PDF parsing）
- [ ] 缓存匹配结果（避免重复调用LLM）
- [ ] 批量匹配优化
- [ ] 匹配历史记录
- [ ] 导出匹配报告

### Phase 3: 高级功能（待开发）
- [ ] 从 GitHub 同步更多职位
- [ ] 签证筛选器（H1B/CPT/OPT）
- [ ] 工作类型筛选器
- [ ] 地点筛选器
- [ ] 薪资筛选器
- [ ] 保存搜索条件

---

## 技术栈

### 后端
- **FastAPI**: Web 框架
- **SQLAlchemy**: ORM
- **SQLite**: 数据库
- **Anthropic Python SDK**: LLM 集成
- **Pydantic**: 数据验证

### 前端
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Zustand**: 状态管理
- **Axios**: HTTP 客户端
- **Tailwind CSS**: 样式
- **Framer Motion**: 动画

---

## 联系支持

如有问题，请：
1. 检查控制台日志
2. 查看 `/docs` API 文档
3. 提交 GitHub Issue

祝你匹配成功！🎉
