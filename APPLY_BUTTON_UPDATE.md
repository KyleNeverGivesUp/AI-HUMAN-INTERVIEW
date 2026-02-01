# 🔗 Apply 按钮跳转到官方申请链接

**日期**: 2026-02-01

## ✅ 完成内容

### 1. **更新岗位申请链接**

修改了 3 个 T-Mobile 岗位的 `application_url`，从通用链接改为具体的 Workday 申请页面：

#### Machine Learning Engineering Intern
```
https://tmobile.wd1.myworkdayjobs.com/External/job/Atlanta-Georgia/Summer-2026-Machine-Learning-Engineering-Internship_REQ342733?utm_source=Simplify&ref=Simplify
```

#### Associate Software Engineer Intern
```
https://tmobile.wd1.myworkdayjobs.com/External/job/Philadelphia-Pennsylvania/Summer-2026-Associate-Software-Engineer-Internship_REQ343873?utm_source=Simplify&ref=Simplify
```

#### Product Owner Intern
```
https://tmobile.wd1.myworkdayjobs.com/External/job/Frisco-Texas/Summer-2026-Product-Owner-Internship_REQ343401?utm_source=Simplify&ref=Simplify
```

---

### 2. **修改 Apply 按钮行为**

**文件**: `frontend/src/pages/JobDetail.tsx`

**Before**:
```typescript
<button onClick={() => applyToJob(selectedJob.id)}>
  Apply Now
</button>
```

**After**:
```typescript
<button
  onClick={() => {
    if (selectedJob.applicationUrl) {
      window.open(selectedJob.applicationUrl, '_blank');  // 新窗口打开
      applyToJob(selectedJob.id);  // 标记为已申请
    }
  }}
>
  Apply Now
</button>
```

---

## 🔄 工作流程

```
用户点击 "Apply Now"
    ↓
打开新标签页 → T-Mobile Workday 申请页面
    ↓
同时标记为 "Applied" → 按钮变为 "Applied ✓"
    ↓
后端保存 has_applied = true
    ↓
用户在新标签页完成申请
```

---

## 🎯 功能特点

### 1. **新窗口打开**
- 使用 `window.open(url, '_blank')`
- 不会离开当前页面
- 用户可以继续浏览其他岗位

### 2. **自动标记已申请**
- 点击后立即调用 `applyToJob()`
- 按钮变为 "Applied ✓"
- 状态保存到数据库

### 3. **友好的 UX**
- Applied 状态下按钮变灰且不可点击
- 防止重复申请
- 视觉反馈清晰

---

## 🧪 测试步骤

### 测试 1: 基本申请流程

1. **访问 JobDetail**: `http://localhost:5173/job/tmobile-ml-engineering-intern-2026`
2. **点击 "Apply Now"**
3. **验证**:
   - ✅ 新标签页打开 T-Mobile Workday 申请页面
   - ✅ 按钮变为 "Applied ✓"
   - ✅ 按钮变灰不可点击

### 测试 2: 不同岗位的链接

**ML Engineering 岗位**:
```bash
# 应该打开
https://tmobile.wd1.myworkdayjobs.com/External/job/Atlanta-Georgia/...REQ342733
```

**Software Engineer 岗位**:
```bash
# 应该打开
https://tmobile.wd1.myworkdayjobs.com/External/job/Philadelphia-Pennsylvania/...REQ343873
```

**Product Owner 岗位**:
```bash
# 应该打开
https://tmobile.wd1.myworkdayjobs.com/External/job/Frisco-Texas/...REQ343401
```

### 测试 3: 已申请状态保持

1. 点击 "Apply Now" → 标记为 Applied
2. 返回 JobBoard
3. 再次点击该岗位进入 JobDetail
4. **验证**: 按钮显示 "Applied ✓" 且不可点击 ✅

---

## 📊 数据库验证

```sql
-- 查看岗位的申请链接
SELECT id, title, application_url 
FROM jobs;

-- 查看已申请状态
SELECT id, title, has_applied 
FROM jobs 
WHERE has_applied = 1;
```

---

## 🔧 修改的文件

### Backend
1. `backend/src/api/job_routes.py` - 更新 seed 数据中的 application_url

### Frontend
1. `frontend/src/pages/JobDetail.tsx` - 修改 Apply 按钮点击行为

---

## 🎨 UI 行为

### 未申请状态
```
┌────────────────────────────┐
│     Apply Now              │  ← 蓝色按钮，可点击
└────────────────────────────┘
```

**点击后**:
- 打开新标签 → T-Mobile Workday 申请页面
- 按钮变为 "Applied ✓"

### 已申请状态
```
┌────────────────────────────┐
│     Applied ✓              │  ← 灰色按钮，不可点击
└────────────────────────────┘
```

---

## 💡 技术细节

### window.open 参数
```typescript
window.open(selectedJob.applicationUrl, '_blank');
```

- **第一个参数**: URL（岗位的官方申请链接）
- **第二个参数**: `'_blank'`（新标签页打开）

### 备选方案

如果需要在当前窗口打开：
```typescript
window.location.href = selectedJob.applicationUrl;
```

如果需要控制窗口特性：
```typescript
window.open(url, '_blank', 'width=1200,height=800');
```

---

## 🎉 功能完成度

| 功能 | 状态 |
|------|------|
| 更新岗位申请 URL | ✅ |
| Apply 按钮新窗口跳转 | ✅ |
| 自动标记已申请 | ✅ |
| Applied 状态持久化 | ✅ |
| 已申请后按钮禁用 | ✅ |
| 数据库更新验证 | ✅ |

所有功能已完成！🎊
