---
title: 数组题常用 Python 代码模板
published: 2026-04-09 16:19:39
description: ''
image: ''
tags: ['数据结构', '数组']
category: '数据结构'
draft: false
lang: ''
---

数组题常用 Python 代码模板

---

# 1. 遍历数组模板

适合：

- 求和
- 最大值/最小值
- 统计次数
- 判断是否存在某个条件

```python
def traverse(nums):
    for x in nums:
        print(x)
```

如果需要下标：

```python
def traverse_with_index(nums):
    for i in range(len(nums)):
        print(i, nums[i])
```

如果同时要下标和值：

```python
def traverse_with_enumerate(nums):
    for i, x in enumerate(nums):
        print(i, x)
```

---

# 2. 查找目标值模板

## 2.1 线性查找

适合无序数组。

```python
def linear_search(nums, target):
    for i, x in enumerate(nums):
        if x == target:
            return i
    return -1
```

---

## 2.2 二分查找

适合有序数组。

```python
def binary_search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1
```

---

# 3. 找左边界 / 右边界模板

适合：

- 查找第一个等于 target 的位置
- 查找最后一个等于 target 的位置
- 查找满足条件的边界

## 3.1 找左边界

```python
def left_bound(nums, target):
    left, right = 0, len(nums) - 1
    ans = -1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] >= target:
            if nums[mid] == target:
                ans = mid
            right = mid - 1
        else:
            left = mid + 1

    return ans
```

## 3.2 找右边界

```python
def right_bound(nums, target):
    left, right = 0, len(nums) - 1
    ans = -1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] <= target:
            if nums[mid] == target:
                ans = mid
            left = mid + 1
        else:
            right = mid - 1

    return ans
```

---

# 4. 双指针模板

## 4.1 左右指针模板

适合：

- 反转数组
- 回文判断
- 有序数组两数之和

```python
def two_pointers_opposite(nums):
    left, right = 0, len(nums) - 1

    while left < right:
        # 根据题意处理 nums[left], nums[right]
        left += 1
        right -= 1
```

### 例：反转数组

```python
def reverse_array(nums):
    left, right = 0, len(nums) - 1

    while left < right:
        nums[left], nums[right] = nums[right], nums[left]
        left += 1
        right -= 1

    return nums
```

### 例：有序数组两数之和

```python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1

    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1

    return []
```

## 4.2 快慢指针模板

适合：

- 删除元素
- 删除重复元素
- 移动零
- 原地压缩

```python
def fast_slow_pointer(nums):
    slow = 0

    for fast in range(len(nums)):
        if 满足条件:
            nums[slow] = nums[fast]
            slow += 1

    return slow   # 新长度
```

### 例：移除指定元素

```python
def remove_element(nums, val):
    slow = 0

    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]
            slow += 1

    return slow
```


### 例：移动零

```python
def move_zeroes(nums):
    slow = 0

    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow += 1

    return nums
```

### 例：有序数组去重

```python
def remove_duplicates(nums):
    if not nums:
        return 0

    slow = 1
    for fast in range(1, len(nums)):
        if nums[fast] != nums[fast - 1]:
            nums[slow] = nums[fast]
            slow += 1

    return slow
```

---

# 5. 滑动窗口模板

适合：

- 最长连续子数组
- 最短连续子数组
- 满足条件的连续区间

```python
def sliding_window(nums):
    left = 0
    ans = 0
    window = 0   # 根据题意维护窗口信息

    for right in range(len(nums)):
        # 1. 扩大窗口
        window += nums[right]

        # 2. 判断是否需要缩小窗口
        while 需要缩小窗口:
            window -= nums[left]
            left += 1

        # 3. 更新答案
        ans = max(ans, right - left + 1)

    return ans
```

## 例：长度最小的子数组和

```python
def min_subarray_len(target, nums):
    left = 0
    total = 0
    ans = float('inf')

    for right in range(len(nums)):
        total += nums[right]

        while total >= target:
            ans = min(ans, right - left + 1)
            total -= nums[left]
            left += 1

    return 0 if ans == float('inf') else ans
```

---

# 6. 前缀和模板

适合：

- 区间和查询
- 子数组和问题
- 连续区间统计

## 6.1 构建前缀和

```python
def build_prefix_sum(nums):
    prefix = [0] * (len(nums) + 1)

    for i in range(len(nums)):
        prefix[i + 1] = prefix[i] + nums[i]

    return prefix
```

## 6.2 查询区间和 [left, right]

```python
def range_sum(prefix, left, right):
    return prefix[right + 1] - prefix[left]
```

### 完整示例

```python
def prefix_sum_example(nums, left, right):
    prefix = [0] * (len(nums) + 1)

    for i in range(len(nums)):
        prefix[i + 1] = prefix[i] + nums[i]

    return prefix[right + 1] - prefix[left]
```

---

# 7. 哈希表模板

适合：

- 两数之和
- 统计频率
- 判断是否重复
- 查找是否存在

## 7.1 两数之和

```python
def two_sum(nums, target):
    mp = {}

    for i, x in enumerate(nums):
        if target - x in mp:
            return [mp[target - x], i]
        mp[x] = i

    return []
```

## 7.2 统计频率

```python
def count_frequency(nums):
    freq = {}

    for x in nums:
        freq[x] = freq.get(x, 0) + 1

    return freq
```

## 7.3 判断是否有重复

```python
def contains_duplicate(nums):
    seen = set()

    for x in nums:
        if x in seen:
            return True
        seen.add(x)

    return False
```

---

# 8. 排序后处理模板

适合：

- 去重
- 合并区间
- 三数之和
- 第 k 大/小问题

```python
def sort_then_process(nums):
    nums.sort()

    for i in range(len(nums)):
        # 排序后按题意处理
        pass
```

---

## 8.1 合并区间模板

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    res = []

    for interval in intervals:
        if not res or res[-1][1] < interval[0]:
            res.append(interval)
        else:
            res[-1][1] = max(res[-1][1], interval[1])

    return res
```

---

# 9. 子数组问题模板

适合：

- 最大子数组和
- 固定长度子数组统计
- 连续区间最优值

## 9.1 最大子数组和（Kadane）

```python
def max_subarray(nums):
    cur = nums[0]
    ans = nums[0]

    for i in range(1, len(nums)):
        cur = max(nums[i], cur + nums[i])
        ans = max(ans, cur)

    return ans
```

---

# 10. 原地修改模板

适合：

- 原地删除
- 原地覆盖
- 原地交换

```python
def inplace_modify(nums):
    slow = 0

    for fast in range(len(nums)):
        if 满足保留条件:
            nums[slow] = nums[fast]
            slow += 1

    return nums[:slow]
```

---

# 11. 矩阵（二维数组）遍历模板

适合：

- 二维数组
- 矩阵题
- 网格遍历

```python
def traverse_matrix(matrix):
    rows, cols = len(matrix), len(matrix[0])

    for i in range(rows):
        for j in range(cols):
            print(matrix[i][j])
```

---

# 12. 原地旋转矩阵模板（90度顺时针）

```python
def rotate(matrix):
    n = len(matrix)

    # 转置
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

    # 每一行反转
    for row in matrix:
        row.reverse()

    return matrix
```

---

# 13. 固定窗口模板

适合：

- 长度固定的子数组最大和
- 固定长度统计问题

```python
def fixed_window(nums, k):
    if len(nums) < k:
        return None

    window_sum = sum(nums[:k])
    ans = window_sum

    for right in range(k, len(nums)):
        window_sum += nums[right]
        window_sum -= nums[right - k]
        ans = max(ans, window_sum)

    return ans
```

---

# 14. 常用输入处理模板（面试/笔试常见）

```python
nums = list(map(int, input().split()))
```

二维数组输入：

```python
n, m = map(int, input().split())
matrix = [list(map(int, input().split())) for _ in range(n)]
```

---

# 15. 数组题调试模板

做数组题时，调试很重要，可以加打印观察指针变化。

```python
def debug_two_pointers(nums):
    left, right = 0, len(nums) - 1

    while left < right:
        print(f"left={left}, right={right}, nums[left]={nums[left]}, nums[right]={nums[right]}")
        left += 1
        right -= 1
```

---

# 16. 数组题万能思考模板

拿到一道题，先问自己：

```python
# 1. 需要遍历统计吗？
# 2. 数组有序吗？能二分吗？
# 3. 是连续区间问题吗？能滑动窗口吗？
# 4. 能用双指针吗？
# 5. 需要频繁求区间和吗？能前缀和吗？
# 6. 能排序后处理吗？
# 7. 能用哈希表优化吗？
# 8. 要求原地修改吗？
```

---

# 17. 最常用模板速查版

如果你只想记最核心的，优先记这 7 个：

## 1）遍历

```python
for i, x in enumerate(nums):
    pass
```

### 2）二分查找

```python
left, right = 0, len(nums) - 1
while left <= right:
    mid = left + (right - left) // 2
```

### 3）左右双指针

```python
left, right = 0, len(nums) - 1
while left < right:
    pass
```

### 4）快慢指针

```python
slow = 0
for fast in range(len(nums)):
    if 条件:
        nums[slow] = nums[fast]
        slow += 1
```

### 5）滑动窗口

```python
left = 0
for right in range(len(nums)):
    while 需要缩小:
        left += 1
```

### 6）前缀和

```python
prefix = [0] * (len(nums) + 1)
for i in range(len(nums)):
    prefix[i + 1] = prefix[i] + nums[i]
```

### 7）哈希表

```python
mp = {}
for i, x in enumerate(nums):
    pass
```

---

如果你愿意，我下一步可以继续给你整理成这几种版本之一：

- **数组题 Python 模板精简版（一页背诵）**
- **LeetCode 数组高频题对应模板**
- **每个模板配 1 道经典例题**
- **数组题常用 Python 技巧总结（切片、enumerate、sorted、zip 等）**
