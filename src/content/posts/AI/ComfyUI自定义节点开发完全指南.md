---
title: ComfyUI 自定义节点开发完全指南
published: 2026-01-22 10:11:50
description: 从零开始学习 ComfyUI 自定义节点开发，包含基础到高级的完整教程和可直接使用的示例代码
image: ''
tags: [AI, ComfyUI, Python]
category: AI
draft: false
lang: zh
---

# 前言

ComfyUI 作为当前最流行的 AI 绘画工具之一，其强大的扩展性主要来源于自定义节点（Custom Nodes）系统。通过自定义节点，你可以：

- 封装重复的 workflow 逻辑
- 集成第三方 Python 库和 API
- 创建全新的功能模块
- 与前端界面深度交互
- 实现任何你需要的图像处理算法

本文将从最基础的概念开始，通过大量可直接运行的示例，帮助你快速掌握 ComfyUI 自定义节点开发的核心技能。

---

# 第一章：环境准备与基础概念

## 1.1 理解 ComfyUI 的节点系统

ComfyUI 的核心是一个**有向无环图（DAG）**执行引擎。每个节点代表一个操作，节点之间通过输入输出端口连接，形成完整的工作流程。

```python
# 节点的核心组成部分
"""
1. INPUT_TYPES: 定义节点的输入参数
2. RETURN_TYPES: 定义节点的输出类型
3. FUNCTION: 执行逻辑的函数
4. CATEGORY: 节点在菜单中的分类
5. 可选方法: VALIDATE_INPUTS、IS_CHANGED 等
"""
```

## 1.2 准备工作环境

首先，你需要有一个运行中的 ComfyUI 环境：

```bash
# 克隆 ComfyUI（如果还没有）
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 创建虚拟环境（推荐）
python -m venv comfyui_env
source comfyui_env/bin/activate  # Linux/Mac
# 或: comfyui_env\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

## 1.3 理解目录结构

```text
ComfyUI/
├── custom_nodes/           # 自定义节点存放目录
│   ├── __init__.py
│   ├── your_node.py       # 你的节点文件
│   └── web/               # 前端文件（可选）
├── nodes.py               # 内置节点（参考学习）
├── comfy/
│   └── comfy_types/       # 类型定义（重要参考）
└── main.py
```

> **重要**：所有自定义节点都必须放在 `custom_nodes/` 目录下，ComfyUI 启动时会自动加载该目录下的所有 Python 模块。

---

# 第二章：编写第一个自定义节点

## 2.1 最简单的节点：Hello World

让我们从一个最简单的节点开始，理解基本结构：

```python
# 文件路径: ComfyUI/custom_nodes/my_first_node.py

class HelloWorldNode:
    """
    这是一个最简单的自定义节点示例
    它不接收任何输入，只是输出一段问候语
    """

    # 定义输出类型 - 这里输出一个字符串
    RETURN_TYPES = ("STRING",)
    # 输出端口的名称（可选，用于显示）
    RETURN_NAMES = ("greeting",)
    # 执行函数名
    FUNCTION = "say_hello"
    # 节点分类
    CATEGORY = "My Nodes/Examples"

    @classmethod
    def INPUT_TYPES(cls):
        """
        定义输入端口
        返回一个字典，包含 required（必填）、optional（可选）、hidden（隐藏）三类
        """
        return {
            "required": {
                "name": ("STRING", {"default": "World", "multiline": False})
            }
        }

    def say_hello(self, name):
        """
        执行函数
        参数名必须与 INPUT_TYPES 中定义的输入名一致
        返回值必须是 tuple，元素数量和类型必须与 RETURN_TYPES 匹配
        """
        greeting = f"Hello, {name}! Welcome to ComfyUI custom nodes!"
        return (greeting,)


# 这两行是必须的，用于注册节点
NODE_CLASS_MAPPINGS = {
    "HelloWorldNode": HelloWorldNode
}

# 可选：定义节点在界面中显示的名称
NODE_DISPLAY_NAME_MAPPINGS = {
    "HelloWorldNode": "Hello World Node"
}

# 必须导出
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
```

## 2.2 测试你的节点

1. 重启 ComfyUI
2. 在节点搜索框中输入 "Hello World"
3. 你应该能看到你的节点
4. 连接一个 "Show Text" 节点来查看输出

## 2.3 使用便利工具创建项目

ComfyUI 官方提供了 `comfy-cli` 工具来快速创建项目结构：

```bash
# 安装 comfy-cli
pip install comfy-cli

# 进入 custom_nodes 目录
cd ComfyUI/custom_nodes

# 创建项目
comfy node scaffold

# 按照提示填写信息：
# - full_name: 你的名字
# - email: 邮箱
# - github_username: GitHub 用户名
# - project_name: 项目名称
# - project_slug: 项目缩写
# - description: 描述
# - version: 版本号
# - license: 选择许可证
# - include_web_directory: 是否包含 web 目录
```

创建完成后，你会得到一个完整的项目结构，可以直接在此基础上开发。

---

# 第三章：输入输出类型详解

## 3.1 支持的数据类型

ComfyUI 支持多种数据类型，以下是常用的：

| 类型 | 说明 | 常见用途 |
|------|------|----------|
| `IMAGE` | 图像张量 (B, H, W, C) | 图像处理 |
| `LATENT` | 潜在空间表示 | 扩散模型 |
| `CLIP` | CLIP 模型 | 文本编码 |
| `MODEL` | 扩散模型 | 生成图像 |
| `VAE` | VAE 模型 | 编解码 |
| `CONDITIONING` | 条件信息 | 文本条件 |
| `INT` | 整数 | 数值参数 |
| `FLOAT` | 浮点数 | 精度参数 |
| `STRING` | 字符串 | 文本 |
| `BOOLEAN` | 布尔值 | 开关 |
| `MASK` | 掩膜 | 区域选择 |
| `CONTROL_NET` | ControlNet 模型 | 条件控制 |
| `*` | 任意类型 | 通用端口 |

## 3.2 带参数约束的输入定义

```python
class NumberNode:
    """展示各种输入参数约束的节点"""

    RETURN_TYPES = ("INT", "FLOAT", "STRING")
    RETURN_NAMES = ("integer", "float", "validation_info")
    FUNCTION = "process"
    CATEGORY = "My Nodes/Numbers"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # 整数输入，带范围约束
                "integer_input": ("INT", {
                    "default": 10,
                    "min": 0,           # 最小值
                    "max": 100,         # 最大值
                    "step": 1,          # 步长
                }),
                # 浮点数输入
                "float_input": ("FLOAT", {
                    "default": 0.5,
                    "min": 0.0,
                    "max": 1.0,
                    "step": 0.01,
                    "round": 0.001,     # 保留小数位数
                }),
                # 带有提示选项的输入
                "preset": (["option_a", "option_b", "option_c"], {
                    "default": "option_a"
                }),
                # 多行文本输入
                "text_input": ("STRING", {
                    "default": "Hello",
                    "multiline": True,  # 允许换行输入
                }),
            },
            "optional": {
                # 可选输入（可以为空）
                "optional_value": ("INT", {
                    "default": 0,
                }),
            },
            "hidden": {
                # 隐藏输入，通常用于内部使用
                "node_id": "UNIQUE_ID",
            }
        }

    def process(self, integer_input, float_input, preset, text_input, 
                optional_value=None, node_id=None):
        info = f"INT: {integer_input}, FLOAT: {float_input}, OPT: {preset}"
        return (int(integer_input), float(float_input), info)
```

## 3.3 动态输入类型

有时我们需要更灵活的输入类型定义：

```python
from comfy.cli_args import NormalMode

class DynamicInputNode:
    """展示动态输入类型的节点"""

    RETURN_TYPES = ("*",)  # 任意类型输出
    FUNCTION = "passthrough"
    CATEGORY = "My Nodes/Advanced"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "anything": ("*", {}),  # 接受任意类型
            }
        }

    def passthrough(self, anything):
        # 原样返回输入
        return (anything,)
```

## 3.4 复合输出类型

```python
class MultiOutputNode:
    """一个节点输出多个结果的示例"""

    RETURN_TYPES = ("INT", "FLOAT", "STRING", "BOOLEAN")
    RETURN_NAMES = ("count", "ratio", "status", "success")
    FUNCTION = "analyze"
    CATEGORY = "My Nodes/Analysis"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "data_size": ("INT", {"default": 100, "min": 1, "max": 1000}),
                "threshold": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0}),
            }
        }

    def analyze(self, data_size, threshold):
        count = data_size
        ratio = threshold * 2
        status = f"Processed {count} items"
        success = ratio <= 1.0
        return (count, ratio, status, success)
```

---

# 第四章：图像处理节点实战

## 4.1 基础图像处理

```python
import torch
import numpy as np
from PIL import Image

class ImageBrightnessNode:
    """调整图像亮度的节点"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),              # 图像输入
                "brightness": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.0,
                    "max": 3.0,
                    "step": 0.1,
                    "round": 0.01
                }),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "adjust_brightness"
    CATEGORY = "My Nodes/Image Processing"

    def adjust_brightness(self, image, brightness):
        """
        image 格式: torch.Tensor, shape 为 (batch, height, width, channels)
        值范围: [0, 1]
        """
        # 将 tensor 转换为 numpy 进行处理
        batch_size = image.shape[0]
        results = []

        for i in range(batch_size):
            img = image[i].cpu().numpy()

            # 转换为 PIL Image
            pil_img = Image.fromarray((img * 255).astype(np.uint8))

            # 调整亮度
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Brightness(pil_img)
            adjusted = enhancer.enhance(brightness)

            # 转换回 tensor
            adjusted_array = np.array(adjusted).astype(np.float32) / 255.0
            results.append(adjusted_array)

        # 堆叠回 batch 格式
        output = torch.from_numpy(np.stack(results, axis=0))
        return (output,)
```

## 4.2 图像尺寸调整节点

```python
class ImageResizeNode:
    """调整图像尺寸的节点"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "width": ("INT", {"default": 512, "min": 1, "max": 4096}),
                "height": ("INT", {"default": 512, "min": 1, "max": 4096}),
            },
            "optional": {
                "maintain_ratio": ("BOOLEAN", {"default": True}),
                "resize_mode": (["crop", "stretch", "pad"], {"default": "stretch"}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "resize_image"
    CATEGORY = "My Nodes/Image Processing"

    def resize_image(self, image, width, height, maintain_ratio=True, resize_mode="stretch"):
        batch_size = image.shape[0]
        results = []

        for i in range(batch_size):
            img = image[i].cpu().numpy()
            pil_img = Image.fromarray((img * 255).astype(np.uint8))

            if maintain_ratio:
                # 保持宽高比
                orig_width, orig_height = pil_img.size
                ratio = min(width / orig_width, height / orig_height)
                new_width = int(orig_width * ratio)
                new_height = int(orig_height * ratio)

                if resize_mode == "stretch":
                    resized = pil_img.resize((width, height), Image.LANCZOS)
                elif resize_mode == "crop":
                    # 居中裁剪
                    resized = self._crop_to_size(pil_img, width, height)
                else:  # pad
                    resized = self._pad_to_size(pil_img, width, height)
            else:
                resized = pil_img.resize((width, height), Image.LANCZOS)

            resized_array = np.array(resized).astype(np.float32) / 255.0
            results.append(resized_array)

        output = torch.from_numpy(np.stack(results, axis=0))
        return (output,)

    def _crop_to_size(self, pil_img, target_width, target_height):
        """裁剪到目标尺寸"""
        orig_width, orig_height = pil_img.size
        left = (orig_width - target_width) // 2
        top = (orig_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        return pil_img.crop((left, top, right, bottom))

    def _pad_to_size(self, pil_img, target_width, target_height):
        """填充到目标尺寸"""
        padded = Image.new("RGB", (target_width, target_height), (0, 0, 0))
        paste_pos = ((target_width - pil_img.width) // 2,
                     (target_height - pil_img.height) // 2)
        padded.paste(pil_img, paste_pos)
        return padded
```

## 4.3 图像合成节点

```python
class ImageCompositeNode:
    """将两张图像合成为一张（Alpha 混合）"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "base_image": ("IMAGE",),          # 基础图像
                "overlay_image": ("IMAGE",),       # 叠加图像
                "opacity": ("FLOAT", {
                    "default": 0.5,
                    "min": 0.0,
                    "max": 1.0,
                    "step": 0.01
                }),
            },
            "optional": {
                "x_offset": ("INT", {"default": 0}),
                "y_offset": ("INT", {"default": 0}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "composite"
    CATEGORY = "My Nodes/Image Processing"

    def composite(self, base_image, overlay_image, opacity, x_offset=0, y_offset=0):
        batch = max(base_image.shape[0], overlay_image.shape[0])
        results = []

        for i in range(batch):
            base = base_image[i % base_image.shape[0]].cpu().numpy()
            overlay = overlay_image[i % overlay_image.shape[0]].cpu().numpy()

            h, w = base.shape[:2]
            oh, ow = overlay.shape[:2]

            # 确保尺寸一致
            if h != oh or w != ow:
                overlay = np.array(Image.fromarray((overlay * 255).astype(np.uint8))
                                  .resize((w, h), Image.LANCZOS)) / 255.0

            # Alpha 混合
            result = base * (1 - opacity) + overlay * opacity
            results.append(result)

        return (torch.from_numpy(np.stack(results, axis=0)),)
```

---

# 第五章：条件逻辑与控制流节点

## 5.1 条件选择节点

```python
class IfElseNode:
    """根据条件选择不同输入的节点"""

    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("output",)
    FUNCTION = "execute"
    CATEGORY = "My Nodes/Control Flow"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "condition": ("BOOLEAN", {"default": True}),
                "if_true": ("*", {}),
                "if_false": ("*", {}),
            }
        }

    def execute(self, condition, if_true, if_false):
        return (if_true if condition else if_false,)
```

## 5.2 数值比较节点

```python
class CompareNode:
    """比较两个数值并输出结果"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value_a": ("FLOAT", {"default": 0.0}),
                "value_b": ("FLOAT", {"default": 0.0}),
                "operation": (["equal", "greater", "less", "greater_equal", "less_equal"], 
                             {"default": "equal"}),
            }
        }

    RETURN_TYPES = ("FLOAT", "FLOAT", "BOOLEAN", "STRING")
    RETURN_NAMES = ("value_a", "value_b", "result", "description")
    FUNCTION = "compare"
    CATEGORY = "My Nodes/Control Flow"

    def compare(self, value_a, value_b, operation):
        if operation == "equal":
            result = abs(value_a - value_b) < 1e-6
            desc = f"{value_a} == {value_b}"
        elif operation == "greater":
            result = value_a > value_b
            desc = f"{value_a} > {value_b}"
        elif operation == "less":
            result = value_a < value_b
            desc = f"{value_a} < {value_b}"
        elif operation == "greater_equal":
            result = value_a >= value_b
            desc = f"{value_a} >= {value_b}"
        else:  # less_equal
            result = value_a <= value_b
            desc = f"{value_a} <= {value_b}"

        return (float(value_a), float(value_b), result, desc)
```

## 5.3 循环计数器

```python
class CounterNode:
    """带计数功能的触发节点"""

    def __init__(self):
        self.count = 0

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "trigger": ("BOOLEAN", {"default": False}),
                "reset": ("BOOLEAN", {"default": False}),
                "increment": ("INT", {"default": 1, "min": 1, "max": 100}),
            }
        }

    RETURN_TYPES = ("INT", "BOOLEAN", "STRING")
    RETURN_NAMES = ("count", "triggered", "status")
    FUNCTION = "count"
    CATEGORY = "My Nodes/Control Flow"

    def count(self, trigger, reset, increment):
        if reset:
            self.count = 0

        if trigger:
            self.count += increment

        status = f"Count: {self.count}, Triggered: {trigger}, Reset: {reset}"
        return (self.count, trigger, status)
```

---

# 第六章：高级功能与最佳实践

## 6.1 使用验证函数

当需要对输入进行更复杂的验证时：

```python
class ValidatedInputNode:
    """使用 VALIDATE_INPUTS 进行输入验证"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "filename": ("STRING", {"default": "image.png"}),
                "quality": ("INT", {"default": 90, "min": 1, "max": 100}),
            }
        }

    RETURN_TYPES = ("STRING", "INT", "BOOLEAN")
    FUNCTION = "process"
    CATEGORY = "My Nodes/Advanced"

    @classmethod
    def VALIDATE_INPUTS(cls, filename, quality):
        """验证输入参数"""
        # 验证文件名
        if not filename.endswith(('.png', '.jpg', '.jpeg', '.gif')):
            return f"Invalid file extension. Supported: png, jpg, jpeg, gif"

        # 验证质量参数
        if quality < 1 or quality > 100:
            return "Quality must be between 1 and 100"

        return True  # 验证通过

    def process(self, filename, quality):
        valid = filename.endswith(('.png', '.jpg', '.jpeg', '.gif'))
        return (filename, quality, valid)
```

## 6.2 检测输入变化

使用 `IS_CHANGED` 来优化执行效率：

```python
class ExpensiveComputationNode:
    """只在新输入变化时才重新计算的节点"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "data": ("STRING", {"multiline": True}),
            }
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "compute"
    CATEGORY = "My Nodes/Advanced"

    @staticmethod
    def IS_CHANGED(data):
        """返回用于判断是否需要重新计算的标识"""
        # 可以返回哈希值、修改时间等
        return hash(data)

    def compute(self, data):
        # 这里模拟一个耗时的计算
        # 只有当 IS_CHANGED 返回不同值时才会执行
        import time
        time.sleep(1)  # 模拟耗时操作
        processed = f"Processed: {data}"
        return (processed,)
```

## 6.3 输出节点

输出节点（如 Display、Save 等）不需要连接到其他节点：

```python
class DebugNode:
    """调试输出节点，打印输入到控制台"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "any_input": ("*", {}),
            },
            "optional": {
                "prefix": ("STRING", {"default": "DEBUG:"}),
            }
        }

    RETURN_TYPES = ()
    OUTPUT_NODE = True  # 标记为输出节点
    FUNCTION = "debug"
    CATEGORY = "My Nodes/Debug"

    def debug(self, any_input, prefix="DEBUG:"):
        print(f"\n{prefix}")
        print(f"Type: {type(any_input)}")
        if hasattr(any_input, 'shape'):
            print(f"Shape: {any_input.shape}")
        if hasattr(any_input, 'dtype'):
            print(f"Dtype: {any_input.dtype}")
        print(f"Value: {any_input}")
        print("-" * 50)
        return ()
```

## 6.4 使用 PIPE_LINE 模式

PIPE_LINE 是一种在 ComfyUI 中传递多个数据的方式：

```python
class PipeBuilderNode:
    """构建数据管道"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value1": ("*", {}),
            },
            "optional": {
                "value2": ("*", {}),
                "value3": ("*", {}),
                "value4": ("*", {}),
            }
        }

    RETURN_TYPES = ("PIPE_LINE",)
    FUNCTION = "build_pipe"
    CATEGORY = "My Nodes/Pipe"

    def build_pipe(self, value1, value2=None, value3=None, value4=None):
        pipe = (value1, value2, value3, value4)
        return (pipe,)


class PipeReaderNode:
    """从数据管道中读取数据"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pipe": ("PIPE_LINE",),
                "index": ("INT", {"default": 0, "min": 0, "max": 3}),
            }
        }

    RETURN_TYPES = ("*",)
    FUNCTION = "read_pipe"
    CATEGORY = "My Nodes/Pipe"

    def read_pipe(self, pipe, index):
        if pipe is None:
            return (None,)
        value = pipe[index] if index < len(pipe) else None
        return (value,)
```

---

# 第七章：前端交互

## 7.1 JavaScript 扩展基础

如果需要与前端交互，可以添加 JavaScript 文件：

```python
# my_node.py
WEB_DIRECTORY = "./web"

class MyWebNode:
    """带前端交互的节点"""

    RETURN_TYPES = ("STRING",)
    FUNCTION = "execute"
    CATEGORY = "My Nodes/Web"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {"default": "Hello"}),
            }
        }

    def execute(self, text):
        return (f"Processed: {text}",)
```

```javascript
// web/my_web_node.js
// 注册扩展
app.registerExtension({
    name: "my_custom.web_interaction",

    async setup() {
        console.log("Extension setup");
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 在节点注册前修改节点定义
        if (nodeData.name === "MyWebNode") {
            // 添加自定义属性
        }
    },

    async nodeCreated(node) {
        // 节点创建后的回调
        console.log("New node created:", node.comfyClass);
    }
});
```

## 7.2 添加自定义设置

```javascript
app.registerExtension({
    name: "my_custom.settings",

    async setup() {
        // 注册自定义设置
        app.extensionManager.registerSetting({
            id: "myExtension.setting1",
            name: "My Setting",
            type: "text",
            defaultValue: "default",
            onChange: (newVal) => {
                console.log("Setting changed:", newVal);
            }
        });
    }
});
```

## 7.3 自定义右键菜单

```javascript
app.registerExtension({
    name: "my_custom.context_menu",

    async setup() {
        // 获取画布菜单
        app.registerExtension({
            name: "my_custom.canvas_menu",
            getCanvasMenuItems(canvas) {
                return [
                    {
                        content: "My Custom Action",
                        callback: () => {
                            console.log("Custom action triggered");
                            // 执行自定义操作
                        }
                    },
                    app.separator,
                    {
                        content: "Another Action",
                        callback: () => {
                            // 另一个操作
                        }
                    }
                ];
            }
        });
    }
});
```

---

# 第八章：项目结构与最佳实践

## 8.1 推荐的项目结构

对于较大的自定义节点项目，推荐使用以下结构：

```text
custom_nodes/my_node_pack/
├── __init__.py                    # 模块入口，导出 NODE_CLASS_MAPPINGS
├── pyproject.toml                 # 项目配置
├── README.md                      # 说明文档
├── requirements.txt               # Python 依赖
├── LICENSE                        # 许可证
├── web/                           # 前端资源（可选）
│   ├── index.js
│   └── styles.css
├── nodes/                         # 节点模块
│   ├── __init__.py
│   ├── image_nodes.py            # 图像处理节点
│   ├── text_nodes.py             # 文本处理节点
│   └── utils.py                  # 工具函数
└── tests/                         # 测试文件
    ├── __init__.py
    └── test_nodes.py
```

## 8.2 `__init__.py` 示例

```python
# __init__.py
from .nodes.image_nodes import (
    ImageBrightnessNode,
    ImageResizeNode,
    ImageCompositeNode,
)
from .nodes.text_nodes import (
    TextProcessorNode,
    StringFormatterNode,
)

__version__ = "1.0.0"

NODE_CLASS_MAPPINGS = {
    "ImageBrightnessNode": ImageBrightnessNode,
    "ImageResizeNode": ImageResizeNode,
    "ImageCompositeNode": ImageCompositeNode,
    "TextProcessorNode": TextProcessorNode,
    "StringFormatterNode": StringFormatterNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageBrightnessNode": "Image Brightness",
    "ImageResizeNode": "Image Resize",
    "ImageCompositeNode": "Image Composite",
    "TextProcessorNode": "Text Processor",
    "StringFormatterNode": "String Formatter",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', '__version__']
```

## 8.3 依赖管理

```txt
# requirements.txt
numpy>=1.20.0
Pillow>=9.0.0
torch>=1.13.0
transformers>=4.25.0
```

```python
# install.py（可选的安装脚本）
import subprocess
import sys

def install_requirements():
    """安装依赖"""
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

if __name__ == "__main__":
    install_requirements()
```

---

# 第九章：常见问题与调试技巧

## 9.1 调试方法

```python
import logging

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DebugExampleNode:
    def process(self, data):
        logger.debug(f"Input data: {data}")
        logger.info("Processing started")
        logger.warning("This is a warning")
        logger.error("This is an error")

        # 打印详细的张量信息
        if hasattr(data, 'shape'):
            logger.debug(f"Tensor shape: {data.shape}")
            logger.debug(f"Tensor dtype: {data.dtype}")
            logger.debug(f"Tensor min/max: {data.min()}/{data.max()}")

        return (data,)
```

## 9.2 常见错误排查

错误 1：导入错误

```text
ModuleNotFoundError: No module named 'xxx'
```

解决方法：安装缺失的依赖，或检查 `requirements.txt`

错误 2：类型不匹配

```text
Output type mismatch: expected IMAGE, got <class 'numpy.ndarray'>
```

解决方法：确保返回类型是 `torch.Tensor`

错误 3：节点不显示

- 检查 `NODE_CLASS_MAPPINGS` 是否正确定义
- 检查 `__all__` 是否包含正确的导出
- 重启 ComfyUI

## 9.3 热重载（开发时使用）

使用 `comfyui-hot-reload` 可以避免频繁重启：

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
# 在 Manager 中安装 "Hot Reload" 节点
```

或者使用命令行参数启动：

```bash
# 只禁用特定节点排查问题
python main.py --disable-all-custom-nodes
```

---

# 第十章：完整示例项目

## 10.1 一个实用的图像处理工具包

以下是完整的示例代码，整合了本文中的各个知识点：

```python
# ComfyUI/custom_nodes/my_toolkit.py

import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageInfoNode:
    """获取图像信息的调试节点"""

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",)}}

    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "info")
    FUNCTION = "get_info"
    CATEGORY = "My Toolkit/Debug"
    OUTPUT_NODE = True

    def get_info(self, image):
        batch_size = image.shape[0]
        height = image.shape[1]
        width = image.shape[2]

        info = f"Batch: {batch_size}, W: {width}, H: {height}"
        print(f"\n[ImageInfo] {info}")

        return (width, height, info)


class ImageAddTextNode:
    """在图像上添加文字"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "text": ("STRING", {"multiline": False}),
                "position": (["top_left", "top_right", "bottom_left", "bottom_right", "center"], 
                            {"default": "bottom_left"}),
                "font_size": ("INT", {"default": 24, "min": 8, "max": 128}),
            },
            "optional": {
                "color": ("STRING", {"default": "white"}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "add_text"
    CATEGORY = "My Toolkit/Image"

    def add_text(self, image, text, position, font_size, color="white"):
        results = []

        for i in range(image.shape[0]):
            img_array = (image[i].cpu().numpy() * 255).astype(np.uint8)
            pil_img = Image.fromarray(img_array)

            draw = ImageDraw.Draw(pil_img)
            width, height = pil_img.size

            # 简单的文字位置计算
            text_bbox = draw.textbbox((0, 0), text)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]

            positions = {
                "top_left": (10, 10),
                "top_right": (width - text_width - 10, 10),
                "bottom_left": (10, height - text_height - 10),
                "bottom_right": (width - text_width - 10, height - text_height - 10),
                "center": ((width - text_width) // 2, (height - text_height) // 2),
            }

            pos = positions.get(position, (10, 10))

            # 绘制文字
            draw.text(pos, text, fill=color)

            result_array = np.array(pil_img).astype(np.float32) / 255.0
            results.append(result_array)

        return (torch.from_numpy(np.stack(results, axis=0)),)


class ImageBatchProcessNode:
    """批量处理图像"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "brightness": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 3.0}),
                "contrast": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 3.0}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "batch_process"
    CATEGORY = "My Toolkit/Image"

    def batch_process(self, images, brightness, contrast):
        from PIL import ImageEnhance

        results = []

        for i in range(images.shape[0]):
            img_array = (images[i].cpu().numpy() * 255).astype(np.uint8)
            pil_img = Image.fromarray(img_array)

            # 调整亮度
            if brightness != 1.0:
                enhancer = ImageEnhance.Brightness(pil_img)
                pil_img = enhancer.enhance(brightness)

            # 调整对比度
            if contrast != 1.0:
                enhancer = ImageEnhance.Contrast(pil_img)
                pil_img = enhancer.enhance(contrast)

            result_array = np.array(pil_img).astype(np.float32) / 255.0
            results.append(result_array)

        return (torch.from_numpy(np.stack(results, axis=0)),)


class RandomSeedNode:
    """生成随机种子"""

    def __init__(self):
        self.seed = 0

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "mode": (["increment", "random", "fixed"], {"default": "increment"}),
                "increment_step": ("INT", {"default": 1, "min": 1, "max": 1000}),
            },
            "optional": {
                "manual_seed": ("INT", {"default": 0}),
            }
        }

    RETURN_TYPES = ("INT", "INT")
    RETURN_NAMES = ("seed", "new_seed")
    FUNCTION = "generate_seed"
    CATEGORY = "My Toolkit/Utils"

    def generate_seed(self, mode, increment_step, manual_seed=None):
        if mode == "increment":
            self.seed += increment_step
        elif mode == "random":
            import random
            self.seed = random.randint(0, 2**31 - 1)
        else:  # fixed
            self.seed = manual_seed if manual_seed else 0

        return (self.seed, self.seed)


# 注册所有节点
NODE_CLASS_MAPPINGS = {
    "ImageInfoNode": ImageInfoNode,
    "ImageAddTextNode": ImageAddTextNode,
    "ImageBatchProcessNode": ImageBatchProcessNode,
    "RandomSeedNode": RandomSeedNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageInfoNode": "Image Info",
    "ImageAddTextNode": "Add Text to Image",
    "ImageBatchProcessNode": "Batch Image Process",
    "RandomSeedNode": "Random Seed Generator",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
```

---

# 第十一章：进阶主题

## 11.1 与 ComfyUI API 交互

```python
from server import PromptServer
from nodes import PROGRESS

class ProgressNotificationNode:
    """演示与 ComfyUI 服务器交互"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "message": ("STRING", {"default": "Processing..."}),
                "progress": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0}),
            }
        }

    RETURN_TYPES = ("STRING",)
   "
    CATEGORY FUNCTION = "notify = "My Toolkit/Advanced"

    def notify(self, message, progress):
        # 发送进度更新到前端
        # 注意：这需要在正确的上下文中使用
        return (f"Progress: {message} - {progress*100:.1f}%",)
```

## 11.2 使用外部 API

```python
import requests
import json

class APICallNode:
    """调用外部 API 的节点"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "url": ("STRING", {"default": "https://api.example.com/data"}),
                "method": (["GET", "POST"], {"default": "GET"}),
            },
            "optional": {
                "request_body": ("STRING", {"multiline": True, "default": ""}),
                "timeout": ("INT", {"default": 30, "min": 1, "max": 300}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("response", "status")
    FUNCTION = "call_api"
    CATEGORY = "My Toolkit/Network"

    def call_api(self, url, method, request_body="", timeout=30):
        try:
            if method == "GET":
                response = requests.get(url, timeout=timeout)
            else:
                headers = {"Content-Type": "application/json"}
                response = requests.post(url, data=request_body, 
                                        headers=headers, timeout=timeout)

            return (response.text, f"Status: {response.status_code}")
        except Exception as e:
            return (f"Error: {str(e)}", "Status: Error")
```

## 11.3 异步处理

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class AsyncProcessNode:
    """异步处理节点"""

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "data": ("STRING", {"multiline": True}),
                "delay": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 10.0}),
            }
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "async_process"
    CATEGORY = "My Toolkit/Advanced"

    def async_process(self, data, delay):
        # 在线程池中执行耗时操作
        import time
        def heavy_computation():
            time.sleep(delay)
            return f"Processed: {len(data)} chars"

        future = self.executor.submit(heavy_computation)
        result = future.result()

        return (result,)
```

---

# 结语

本文涵盖了 ComfyUI 自定义节点开发的各个方面，从基础概念到高级应用。在实际开发中，建议：

1. **从简单开始**：先实现基本功能，再逐步添加高级特性
2. **参考现有节点**：ComfyUI 内置节点和社区节点是很好的学习资源
3. **测试驱动**：编写测试用例，确保节点的正确性
4. **文档完善**：为你的节点编写清晰的文档和使用说明
5. **错误处理**：添加适当的异常处理，提高节点稳定性

希望这份指南能帮助你快速上手 ComfyUI 自定义节点开发。如果有任何问题，欢迎通过 GitHub 社区寻求帮助。

---

# 参考资源

- [ComfyUI 官方文档](https://docs.comfy.org/)
- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI)
- [ComfyUI Manager](https://github.com/ltdrdata/ComfyUI-Manager)
- [ComfyUI 社区节点集合](https://github.com/ltdrdata/ComfyUI-Impact-Pack)
