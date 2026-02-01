# 🔄 数据库重置 & 新岗位添加总结

**日期**: 2026-02-01

## ✅ 完成内容

### 1. **清空旧数据**
- ✅ 修改 `/api/jobs/seed` endpoint，添加清空逻辑
- ✅ 清空数据库中所有旧的 job 数据
- ✅ 清空匹配度数据

### 2. **添加 3 个新的 T-Mobile 岗位**

#### 岗位 1: Machine Learning Engineering Intern
```
ID: tmobile-ml-engineering-intern-2026
Location: Atlanta, GA / Bellevue, WA
Salary: $20-40/hour
Duration: 11 weeks

Skills: ML Engineering, Python, LLMs, MLOps, CI/CD, Model Serving, API Development
Sponsorship: No H1B/CPT/OPT
Auto-matched Skill: ml-ai-interview
```

**职责亮点**:
- 构建可扩展的 ML 训练和推理管道
- 开发 MLOps 最佳实践（模型版本控制、CI/CD、漂移检测）
- 将研究原型转化为生产就绪的机器学习系统
- AI 可观测性：监控、评估和改进 ML/LLM 系统

---

#### 岗位 2: Associate Software Engineer Intern
```
ID: tmobile-associate-swe-intern-2026
Location: Philadelphia, PA
Salary: $26-47/hour
Duration: 11 weeks

Skills: Java, Python, JavaScript, TypeScript, Data Structures, Algorithms, OOP, Agile, CI/CD
Sponsorship: No H1B/CPT/OPT
Auto-matched Skill: backend-interview
```

**职责亮点**:
- 设计、开发、测试和维护软件应用
- 编写干净、可读、文档完善的代码
- 参与代码审查，与跨职能团队协作
- 学习现代开发工具、框架和方法（Agile、CI/CD）

---

#### 岗位 3: Product Owner Intern
```
ID: tmobile-product-owner-intern-2026
Location: Frisco, TX / Bellevue, WA
Salary: $26-47/hour
Duration: 11 weeks

Skills: Product Ownership, Agile, Jira, Data Analysis, Feature Definition, AI Products
Sponsorship: No H1B/CPT/OPT
Auto-matched Skill: product-interview (新创建)
```

**职责亮点**:
- 端到端拥有功能，从发现到交付和验证
- 与工程师合作推动开发、分类 bug、消除障碍
- 支持敏捷仪式，确保功能处于开发就绪状态
- 分析交付数据，识别提升团队速度的机会
- 探索自动化机会以简化产品交付

---

### 3. **新建 Product Skill**

创建了 `/backend/skills/product/SKILL.md`：

```markdown
---
name: product-interview
description: Focuses on product thinking, agile practices, and AI product development for interns.
---

# Role Identity
You are a senior product manager interviewing interns for a product owner role.

# JD Match Question (First Question)
Template: "I see you have experience with {product_skill_from_resume}. 
Can you walk me through a project where you defined features or worked 
with a team to deliver something, and how that relates to {jd_product_requirement}?"

# Interview Focus
1. Product Thinking: feature definition and prioritization
2. Agile Basics: sprints, user stories, backlog management
3. Collaboration: working with engineers, designers, stakeholders
4. Data Awareness: using metrics and feedback for decisions

# Simple Question Bank
- "What is a user story? Can you give an example?"
- "How would you prioritize features when you have limited time?"
- "Tell me about a time you worked with engineers to solve a problem."
- "How do you know if a feature is successful after launch?"
```

---

### 4. **更新 Skill 匹配逻辑**

修改 `agent.py` 的 `_match_role_to_skill` 方法：

```python
# 新增匹配规则
if "product owner" in normalized or "product manager" in normalized or "pm" in normalized:
    return "product-interview", "Product"

if "software engineer" in normalized or "swe" in normalized:
    return "backend-interview", "Backend"
```

现在支持的 skill 类型：
- `ml-ai-interview` → ML/AI, Machine Learning
- `product-interview` → Product Owner, Product Manager, PM (新)
- `backend-interview` → Backend, Software Engineer, SWE (更新)
- `frontend-interview` → Frontend
- `fullstack-interview` → Fullstack
- `ai-infra-interview` → AI Infra
- `devops-interview` → DevOps, SRE

---

## 🎯 自动匹配结果

### 岗位 → Skill 映射

| 岗位 Title | Auto-matched Skill | 面试风格 |
|-----------|-------------------|---------|
| Machine Learning Engineering Intern | `ml-ai-interview` | ML 基础、Python、LLM 工具 |
| Associate Software Engineer Intern | `backend-interview` | 数据库、算法、网络基础 |
| Product Owner Intern | `product-interview` | 产品思维、Agile、协作 |

---

## 📊 数据验证

运行 seed 脚本后的结果：

```bash
✅ Successfully seeded jobs:
  - Machine Learning Engineering Intern at T-Mobile
  - Associate Software Engineer Intern at T-Mobile
  - Product Owner Intern at T-Mobile
```

---

## 🧪 测试步骤

### 1. 验证岗位列表
```bash
curl http://localhost:8000/api/jobs/ | jq
```

应该只显示 3 个 T-Mobile 岗位。

### 2. 验证 Skill 自动匹配

**测试 ML 岗位**:
```bash
# 开始面试时传递 job_id: tmobile-ml-engineering-intern-2026
# 应该自动匹配 ml-ai-interview skill
```

**测试 SWE 岗位**:
```bash
# 开始面试时传递 job_id: tmobile-associate-swe-intern-2026
# 应该自动匹配 backend-interview skill
```

**测试 Product 岗位**:
```bash
# 开始面试时传递 job_id: tmobile-product-owner-intern-2026
# 应该自动匹配 product-interview skill (新)
```

### 3. 验证第一个问题生成

打招呼后第一个问题应该是基于 SKILL.md 的 "JD Match Question" 模板生成的，连接候选人简历和 JD 要求。

---

## 🔧 修改的文件

### Backend
1. ✅ `backend/src/api/job_routes.py` - 修改 seed endpoint（清空 + 新岗位）
2. ✅ `backend/skills/product/SKILL.md` - 新建 Product skill
3. ✅ `backend/src/services/agent.py` - 更新 skill 匹配逻辑

### Skills（之前已完成）
- `backend/skills/backend/SKILL.md` - 添加 JD Match Question
- `backend/skills/frontend/SKILL.md` - 添加 JD Match Question
- `backend/skills/fullstack/SKILL.md` - 添加 JD Match Question
- `backend/skills/ml-ai/SKILL.md` - 添加 JD Match Question
- `backend/skills/ai-infra/SKILL.md` - 添加 JD Match Question
- `backend/skills/devops/SKILL.md` - 添加 JD Match Question

---

## 🚀 下一步

1. **前端刷新**: 刷新前端页面 `http://localhost:5173/jobs`
2. **验证岗位列表**: 应该只看到 3 个 T-Mobile 岗位
3. **上传简历**: 确保有简历数据用于匹配
4. **测试面试流程**:
   - 点击任意岗位进入详情
   - 点击 "Start Interview"
   - 观察第一个问题是否基于 skill 的 JD 匹配模板生成

---

## 📝 关键变化总结

### Before (之前)
- 3 个不同公司的岗位（T-Mobile, Blizzard, Alo Yoga）
- 6 个 skills（无 Product skill）
- Seed 不会清空旧数据

### After (现在)
- ✅ 3 个 T-Mobile 岗位（ML, SWE, Product Owner）
- ✅ 7 个 skills（新增 Product skill）
- ✅ Seed 会先清空所有旧数据
- ✅ 所有岗位自动匹配对应的 skill
- ✅ 第一个问题基于 skill 模板 + JD + 简历生成

---

## 🎉 功能完整性

| 功能 | 状态 |
|------|------|
| 清空旧 job 数据 | ✅ |
| 添加 3 个新 T-Mobile 岗位 | ✅ |
| 创建 Product skill | ✅ |
| 自动匹配 skill | ✅ |
| JD 匹配问题生成 | ✅ |
| 简历与 JD 匹配分析 | ✅ (之前已完成) |
| 智能面试对话 | ✅ (之前已完成) |

**所有功能已完成！** 🎊
