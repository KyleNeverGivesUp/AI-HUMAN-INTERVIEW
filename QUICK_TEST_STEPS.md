# ⚡ 快速测试 Tab 功能

## 🔄 我已经帮你重置了数据库

所有岗位现在都在 **Matched** tab (is_liked=0, has_applied=0)

---

## 🎯 现在请按照以下步骤测试

### 1️⃣ 硬刷新浏览器
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + F5
```

### 2️⃣ 打开 JobBoard
```
http://localhost:5173/
```

### 3️⃣ 检查初始状态

你应该看到：
- **Matched tab**: 3 个岗位
  - Machine Learning Engineering Intern
  - Associate Software Engineer Intern
  - Product Owner Intern
- **Liked tab**: 0
- **Applied tab**: 0

---

## ✅ 测试 1: 收藏功能

1. **在 Matched 里找到任意岗位**
2. **点击右上角爱心 ♡**
3. **岗位应该消失**
4. **切换到 Liked tab**
5. **岗位应该出现在这里**

**验证**:
- ✅ Matched count: 3 → 2
- ✅ Liked count: 0 → 1

---

## ✅ 测试 2: 取消收藏

1. **在 Liked tab**
2. **再次点击爱心 ♥**
3. **岗位应该消失**
4. **切换回 Matched tab**
5. **岗位应该回来了**

**验证**:
- ✅ Liked count: 1 → 0
- ✅ Matched count: 2 → 3

---

## ✅ 测试 3: 申请岗位

1. **在 Matched 里找到任意岗位**
2. **点击 "Apply" 按钮**
3. **岗位应该消失**
4. **切换到 Applied tab**
5. **岗位应该出现在这里**
6. **✨ 按钮应该变成 "← Move to Matched" (蓝色)**

**验证**:
- ✅ Matched count: 3 → 2
- ✅ Applied count: 0 → 1
- ✅ 按钮是蓝色的 "← Move to Matched"

---

## ✅ 测试 4: 取消申请

1. **在 Applied tab**
2. **点击 "← Move to Matched" 按钮**
3. **岗位应该消失**
4. **切换回 Matched tab**
5. **岗位应该回来了**

**验证**:
- ✅ Applied count: 1 → 0
- ✅ Matched count: 2 → 3

---

## 🐛 如果还是没效果

### 方案 1: 检查前端是否运行
```bash
# 检查端口
lsof -i :5173
```

如果没有输出，启动前端：
```bash
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/frontend
npm run dev
```

### 方案 2: 检查后端是否运行
```bash
# 检查端口
lsof -i :8000
```

如果没有输出，启动后端：
```bash
cd /Users/kyle/Projects/AI-HUMAN-INTERVIEW/backend
./venv/bin/python -m uvicorn src.main:app --reload
```

### 方案 3: 清除浏览器状态
1. 打开 DevTools (F12)
2. Console tab
3. 输入并回车:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

### 方案 4: 检查浏览器 Console
1. 打开 DevTools (F12)
2. Console tab
3. 看是否有红色错误信息
4. 如果有，截图给我看

---

## 📱 测试视频演示

**期望效果**:

```
1. 初始: Matched (3) | Liked (0) | Applied (0)
   
2. 点爱心:
   Matched (2) | Liked (1) | Applied (0)
   
3. 再点爱心:
   Matched (3) | Liked (0) | Applied (0)
   
4. 点 Apply:
   Matched (2) | Liked (0) | Applied (1)
   [按钮变成蓝色 "← Move to Matched"]
   
5. 点 Move to Matched:
   Matched (3) | Liked (0) | Applied (0)
```

---

## 🎉 成功了吗？

如果所有测试都通过，恭喜！功能完美运行！

如果还有问题，请告诉我：
1. 哪一步没效果？
2. 浏览器 Console 有什么错误？
3. 截图给我看看
