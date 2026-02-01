# 🧪 Tab 功能测试指南

## 问题诊断

如果看不到效果，可能是因为：
1. ❌ 浏览器缓存（需要硬刷新）
2. ❌ 前端 dev server 需要重启
3. ❌ 后端 API 没有返回正确数据

---

## 🔄 测试前准备

### 1. 重置数据库状态

```bash
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/backend

# 重置所有岗位状态
sqlite3 resumes.db "UPDATE jobs SET is_liked = 0, has_applied = 0;"

# 验证
sqlite3 resumes.db "SELECT id, title, is_liked, has_applied FROM jobs;"
```

**期望输出**:
```
tmobile-ml-engineering-intern-2026|Machine Learning Engineering Intern|0|0
tmobile-associate-swe-intern-2026|Associate Software Engineer Intern|0|0
tmobile-product-owner-intern-2026|Product Owner Intern|0|0
```

### 2. 重启前端 dev server

```bash
# 找到前端进程并杀掉
ps aux | grep vite
kill -9 <PID>

# 重新启动
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/frontend
npm run dev
```

### 3. 清除浏览器缓存

- **Chrome/Edge**: `Cmd+Shift+R` (Mac) 或 `Ctrl+Shift+R` (Windows)
- **Firefox**: `Cmd+Shift+R` (Mac) 或 `Ctrl+F5` (Windows)
- 或者打开 DevTools → Network → Disable cache

---

## ✅ 完整测试流程

### 测试 1: 初始状态

1. **打开**: `http://localhost:5173/`
2. **切换到 Matched tab**
3. **验证**: 应该看到 3 个岗位
   - Machine Learning Engineering Intern
   - Associate Software Engineer Intern
   - Product Owner Intern
4. **验证 Tab 计数**:
   - Matched: 3
   - Liked: 0
   - Applied: 0

---

### 测试 2: 收藏功能 (Matched → Liked)

1. **在 Matched tab 找到 "Machine Learning" 岗位**
2. **点击右上角爱心图标 ♡**
3. **验证动画**: 爱心变红，填充 ♥
4. **等待 1 秒**: 岗位应该从 Matched 消失
5. **切换到 Liked tab**
6. **验证**: "Machine Learning" 岗位出现在 Liked
7. **验证 Tab 计数**:
   - Matched: 2
   - Liked: 1
   - Applied: 0

---

### 测试 3: 取消收藏 (Liked → Matched)

1. **在 Liked tab 找到 "Machine Learning" 岗位**
2. **再次点击爱心图标 ♥**
3. **验证动画**: 爱心变空，轮廓 ♡
4. **等待 1 秒**: 岗位应该从 Liked 消失
5. **切换到 Matched tab**
6. **验证**: "Machine Learning" 岗位回到 Matched
7. **验证 Tab 计数**:
   - Matched: 3
   - Liked: 0
   - Applied: 0

---

### 测试 4: 申请功能 (Matched → Applied)

1. **在 Matched tab 找到 "Software Engineer" 岗位**
2. **点击 "Apply" 按钮**
3. **等待 1 秒**: 岗位应该从 Matched 消失
4. **切换到 Applied tab**
5. **验证**: "Software Engineer" 岗位出现在 Applied
6. **验证按钮**: 应该看到 **"← Move to Matched"** (蓝色按钮)
7. **验证 Tab 计数**:
   - Matched: 2
   - Liked: 0
   - Applied: 1

---

### 测试 5: 取消申请 (Applied → Matched)

1. **在 Applied tab 找到 "Software Engineer" 岗位**
2. **点击 "← Move to Matched" 按钮**
3. **等待 1 秒**: 岗位应该从 Applied 消失
4. **切换到 Matched tab**
5. **验证**: "Software Engineer" 岗位回到 Matched
6. **验证 Tab 计数**:
   - Matched: 3
   - Liked: 0
   - Applied: 0

---

### 测试 6: 复杂场景 (Matched → Liked → Applied)

1. **在 Matched 找到 "Product Owner" 岗位**
2. **点击爱心 ♡** → 移到 Liked
3. **在 Liked 找到 "Product Owner"**
4. **点击 "Apply"** → 移到 Applied
5. **验证 Tab 计数**:
   - Matched: 2
   - Liked: 0
   - Applied: 1

6. **在 Applied 点击 "← Move to Matched"**
7. **验证**: 因为 `isLiked=true`，应该回到 **Liked**（不是 Matched）
8. **切换到 Liked tab**
9. **验证**: "Product Owner" 出现在 Liked
10. **验证 Tab 计数**:
    - Matched: 2
    - Liked: 1
    - Applied: 0

---

## 🐛 常见问题

### 问题 1: 点击按钮没反应

**原因**: 前端 dev server 没有热更新

**解决**:
```bash
# 重启前端
cd frontend
npm run dev
```

### 问题 2: Tab 计数不更新

**原因**: Zustand store 没有触发重新渲染

**解决**: 硬刷新浏览器 `Cmd+Shift+R`

### 问题 3: 岗位在错误的 tab

**原因**: 数据库状态不一致

**解决**:
```bash
# 检查数据库
sqlite3 backend/resumes.db "SELECT id, title, is_liked, has_applied FROM jobs;"

# 重置
sqlite3 backend/resumes.db "UPDATE jobs SET is_liked = 0, has_applied = 0;"
```

### 问题 4: "← Move to Matched" 按钮不显示

**原因**: `currentTab` 没有正确传递到 JobCard

**检查**:
1. 打开浏览器 DevTools (F12)
2. Console tab
3. 输入: `localStorage.clear()` 回车
4. 刷新页面

---

## 🔍 调试命令

### 检查 API 状态

```bash
# 获取所有岗位
curl http://localhost:8000/api/jobs

# 点赞岗位
curl -X POST http://localhost:8000/api/jobs/tmobile-ml-engineering-intern-2026/like

# 申请岗位
curl -X POST http://localhost:8000/api/jobs/tmobile-ml-engineering-intern-2026/apply

# 取消申请
curl -X POST http://localhost:8000/api/jobs/tmobile-ml-engineering-intern-2026/unapply
```

### 检查数据库

```bash
cd backend

# 查看所有岗位状态
sqlite3 resumes.db "SELECT id, title, is_liked, has_applied FROM jobs;"

# 设置特定岗位为已收藏
sqlite3 resumes.db "UPDATE jobs SET is_liked = 1 WHERE id = 'tmobile-ml-engineering-intern-2026';"

# 设置特定岗位为已申请
sqlite3 resumes.db "UPDATE jobs SET has_applied = 1 WHERE id = 'tmobile-associate-swe-intern-2026';"
```

---

## 📊 预期行为对照表

| 岗位状态 | isLiked | hasApplied | 显示在哪个 Tab | 按钮文字 |
|---------|---------|------------|---------------|---------|
| 新岗位 | false | false | Matched | "Apply" |
| 已收藏 | true | false | Liked | "Apply" |
| 已申请 | false | true | Applied | "← Move to Matched" |
| 已收藏+已申请 | true | true | Applied | "← Move to Matched" |

---

## ✅ 成功标志

如果以下都正确，说明功能正常：

- ✅ 3 个 tab 正确显示计数
- ✅ 点击爱心，岗位在 Matched ↔ Liked 之间移动
- ✅ 点击 Apply，岗位移到 Applied
- ✅ Applied tab 显示蓝色 "← Move to Matched" 按钮
- ✅ 点击 "Move to Matched"，岗位回到 Matched 或 Liked
- ✅ 所有操作后，tab 计数实时更新

---

## 🚀 快速重置脚本

创建这个脚本以便快速重置测试环境：

```bash
#!/bin/bash
# reset_jobs.sh

cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/backend

echo "🔄 Resetting all jobs..."
sqlite3 resumes.db "UPDATE jobs SET is_liked = 0, has_applied = 0, match_percentage = 0;"

echo "✅ Current job states:"
sqlite3 resumes.db "SELECT id, title, is_liked, has_applied FROM jobs;"

echo "
🎯 Test URLs:
- JobBoard: http://localhost:5173/
- API: http://localhost:8000/api/jobs

📝 Next steps:
1. 硬刷新浏览器: Cmd+Shift+R
2. 切换到 Matched tab
3. 应该看到 3 个岗位
"
```

**使用**:
```bash
chmod +x reset_jobs.sh
./reset_jobs.sh
```

---

完成所有测试后，功能应该完全正常工作！🎉
