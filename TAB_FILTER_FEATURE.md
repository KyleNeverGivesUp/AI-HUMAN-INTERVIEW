# 🏷️ Tab 过滤和状态管理功能

**日期**: 2026-02-01

## ✅ 完成内容

### 1. **Tab 过滤逻辑优化**

#### 之前的问题：
- Matched: 显示所有未申请的岗位（包括已收藏的）
- Liked: 显示所有收藏的岗位（包括已申请的）
- Applied: 显示所有已申请的岗位

**结果**: Machine Learning 岗位点了 Apply 后跑到 Applied，但收藏的岗位同时出现在 Matched 和 Liked 里。

#### 新的逻辑：
- **Matched**: 未申请 **且** 未收藏的岗位 (`!hasApplied && !isLiked`)
- **Liked**: 已收藏 **且** 未申请的岗位 (`isLiked && !hasApplied`)
- **Applied**: 已申请的岗位（不管是否收藏）(`hasApplied`)

**流程图**:
```
新岗位
  ↓
默认在 Matched
  ↓
点爱心 → 移到 Liked
  ↓
在 Liked 点爱心 → 取消收藏 → 回到 Matched
  ↓
点 Apply → 移到 Applied
  ↓
在 Applied 点 "Move to Matched" → 回到 Matched
```

---

### 2. **动态 Tab 计数**

**Before**:
```typescript
const tabs = [
  { id: 'matched', label: 'Matched' },
  { id: 'liked', label: 'Liked', count: 1 },  // 硬编码
  { id: 'applied', label: 'Applied', count: 1 },  // 硬编码
];
```

**After**:
```typescript
// 动态计算每个 tab 的数量
const likedCount = jobs.filter(job => job.isLiked && !job.hasApplied).length;
const appliedCount = jobs.filter(job => job.hasApplied).length;
const matchedCount = jobs.filter(job => !job.hasApplied && !job.isLiked).length;

const tabs = [
  { id: 'matched', label: 'Matched', count: matchedCount },
  { id: 'liked', label: 'Liked', count: likedCount },
  { id: 'applied', label: 'Applied', count: appliedCount },
];
```

---

### 3. **Applied Tab 的取消申请功能**

**UI 变化**:

#### Matched/Liked Tab:
```
┌────────────────────────────────────┐
│ Job Card                           │
│ ────────────────────────────────   │
│ [ Apply ]  [ Mock Interview ]      │
└────────────────────────────────────┘
```

#### Applied Tab:
```
┌────────────────────────────────────┐
│ Job Card                           │
│ ────────────────────────────────   │
│ [ ← Move to Matched ] [ Mock Int.] │
└────────────────────────────────────┘
```

**按钮样式**:
```typescript
// 在 Applied tab 显示蓝色按钮
<button className="bg-blue-100 text-blue-700 hover:bg-blue-200">
  ← Move to Matched
</button>

// 在其他 tab 显示灰色按钮
<button className="bg-gray-100 text-gray-700 hover:bg-gray-200">
  Apply
</button>
```

---

### 4. **后端 API 支持**

新增 `/api/jobs/{job_id}/unapply` endpoint:

```python
@router.post("/{job_id}/unapply")
async def unapply_to_job(job_id: str, db: Session = Depends(get_db)):
    """Unapply job (move back to Matched)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.has_applied = False
    db.commit()
    
    return {"applied": False}
```

---

## 🔄 完整工作流程

### 场景 1: 收藏岗位
```
1. 用户在 Matched 看到岗位
   ↓
2. 点击爱心 ♡
   ↓
3. toggleLike API 调用
   ↓
4. job.isLiked = true
   ↓
5. 岗位从 Matched 消失，出现在 Liked tab
   ↓
6. Liked count: 0 → 1
   Matched count: 3 → 2
```

### 场景 2: 取消收藏
```
1. 用户在 Liked 看到岗位
   ↓
2. 再次点击爱心 ♥
   ↓
3. toggleLike API 调用
   ↓
4. job.isLiked = false
   ↓
5. 岗位从 Liked 消失，回到 Matched tab
   ↓
6. Liked count: 1 → 0
   Matched count: 2 → 3
```

### 场景 3: 申请岗位
```
1. 用户在 Matched/Liked 看到岗位
   ↓
2. 点击 "Apply" 按钮
   ↓
3. applyToJob API 调用
   ↓
4. job.hasApplied = true
   ↓
5. 岗位消失，出现在 Applied tab
   ↓
6. Applied count: 0 → 1
   原 tab count: -1
```

### 场景 4: 取消申请
```
1. 用户在 Applied 看到岗位
   ↓
2. 点击 "← Move to Matched" 按钮
   ↓
3. unapplyJob API 调用
   ↓
4. job.hasApplied = false
   ↓
5. 岗位消失，回到 Matched tab
   (如果之前 isLiked=true，则回到 Liked)
   ↓
6. Applied count: 1 → 0
   Matched/Liked count: +1
```

---

## 🔧 修改的文件

### Frontend

#### 1. `frontend/src/store/useJobStore.ts`

**新增方法**:
```typescript
unapplyJob: async (jobId) => {
  try {
    await axios.post(`/api/jobs/${jobId}/unapply`);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId ? { ...job, hasApplied: false } : job
      ),
    }));
  } catch (error) {
    console.error('Failed to unapply job:', error);
  }
}
```

**修改过滤逻辑**:
```typescript
getFilteredJobs: () => {
  const { jobs, currentTab } = get();
  
  switch (currentTab) {
    case 'liked':
      return jobs.filter((job) => job.isLiked && !job.hasApplied);
    case 'applied':
      return jobs.filter((job) => job.hasApplied);
    case 'matched':
    default:
      return jobs.filter((job) => !job.hasApplied && !job.isLiked);
  }
}
```

#### 2. `frontend/src/components/JobList.tsx`

**动态计算 count**:
```typescript
const likedCount = jobs.filter(job => job.isLiked && !job.hasApplied).length;
const appliedCount = jobs.filter(job => job.hasApplied).length;
const matchedCount = jobs.filter(job => !job.hasApplied && !job.isLiked).length;

const tabs = [
  { id: 'matched', label: 'Matched', count: matchedCount },
  { id: 'liked', label: 'Liked', count: likedCount },
  { id: 'applied', label: 'Applied', count: appliedCount },
];
```

#### 3. `frontend/src/components/JobCard.tsx`

**根据 tab 显示不同按钮**:
```typescript
const { currentTab, toggleLike, applyToJob, unapplyJob, setSelectedJob } = useJobStore();

// ...

{currentTab === 'applied' ? (
  <button onClick={handleUnapply} className="bg-blue-100 text-blue-700">
    ← Move to Matched
  </button>
) : (
  <button onClick={handleApply} className="bg-gray-100 text-gray-700">
    {job.hasApplied ? 'Applied' : 'Apply'}
  </button>
)}
```

### Backend

#### 4. `backend/src/api/job_routes.py`

**新增 unapply endpoint**:
```python
@router.post("/{job_id}/unapply")
async def unapply_to_job(job_id: str, db: Session = Depends(get_db)):
    """Unapply job (move back to Matched)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.has_applied = False
    db.commit()
    
    return {"applied": False}
```

---

## 🧪 测试步骤

### 测试 1: Tab 过滤

1. **访问 JobBoard**: `http://localhost:5173/`
2. **观察 Matched tab**: 应该显示未申请且未收藏的岗位
3. **点击 Liked tab**: 应该显示已收藏但未申请的岗位
4. **点击 Applied tab**: 应该显示已申请的岗位

### 测试 2: 收藏/取消收藏

1. **在 Matched 里点击爱心**:
   - ✅ 岗位从 Matched 消失
   - ✅ 切换到 Liked tab，岗位出现
   - ✅ Liked count +1, Matched count -1

2. **在 Liked 里再次点击爱心**:
   - ✅ 岗位从 Liked 消失
   - ✅ 切换到 Matched tab，岗位出现
   - ✅ Liked count -1, Matched count +1

### 测试 3: 申请/取消申请

1. **在 Matched 里点击 Apply**:
   - ✅ 岗位从 Matched 消失
   - ✅ 切换到 Applied tab，岗位出现
   - ✅ Applied count +1, Matched count -1

2. **在 Applied 里点击 "← Move to Matched"**:
   - ✅ 岗位从 Applied 消失
   - ✅ 切换到 Matched tab，岗位出现
   - ✅ Applied count -1, Matched count +1

### 测试 4: 复杂场景

1. **收藏后申请**:
   ```
   Matched → 点爱心 → Liked → 点 Apply → Applied
   ```
   - ✅ 最终在 Applied tab
   - ✅ 爱心状态保持（isLiked=true）

2. **取消申请后**:
   ```
   Applied → 点 "Move to Matched" → 回到哪里？
   ```
   - 如果 `isLiked=true`: 回到 Liked ✅
   - 如果 `isLiked=false`: 回到 Matched ✅

---

## 📊 状态转换表

| 当前状态 | 操作 | 新状态 | UI 变化 |
|---------|------|--------|---------|
| Matched | 点爱心 | Liked | 从 Matched 消失 → Liked 出现 |
| Liked | 点爱心 | Matched | 从 Liked 消失 → Matched 出现 |
| Matched | 点 Apply | Applied | 从 Matched 消失 → Applied 出现 |
| Liked | 点 Apply | Applied | 从 Liked 消失 → Applied 出现 |
| Applied | 点 Move to Matched (且 isLiked=false) | Matched | 从 Applied 消失 → Matched 出现 |
| Applied | 点 Move to Matched (且 isLiked=true) | Liked | 从 Applied 消失 → Liked 出现 |

---

## 💡 技术细节

### 过滤优先级
```
1. Applied: hasApplied === true (最高优先级)
2. Liked: isLiked === true && hasApplied === false
3. Matched: isLiked === false && hasApplied === false (默认)
```

### 为什么 Applied 不排除 isLiked？
因为申请比收藏更重要。一旦申请，就应该在 Applied tab 显示，不管是否收藏。取消申请后，再根据 isLiked 决定回到 Liked 还是 Matched。

---

## 🎉 功能完成度

| 功能 | 状态 |
|------|------|
| Tab 过滤逻辑修复 | ✅ |
| 动态 Tab 计数 | ✅ |
| Applied 取消申请按钮 | ✅ |
| 后端 unapply API | ✅ |
| 状态持久化 | ✅ |
| UI 响应式更新 | ✅ |

所有功能已完成！🎊
