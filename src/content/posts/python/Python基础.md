---
title: Python基础
published: 2025-12-10
description: ""
image: ""
tags: ["Python"]
category: "Python"
draft: false
lang: ""
---

# 可变类型和不可变类型

- **可变类型**：对象内容可以改变，修改时不创建新对象。常见的可变类型有：列表（`list`）、字典（`dict`）、集合（`set`）。
- **不可变类型**：对象内容不能改变，修改时会创建一个新的对象。常见的不可变类型有：整数（`int`）、浮点数（`float`）、字符串（`str`）、元组（`tuple`）。

| **特性**       | **可变类型**                             | **不可变类型**                                           |
| -------------- | ---------------------------------------- | -------------------------------------------------------- |
| **定义**       | 对象的内容可以被修改                     | 对象一旦创建，内容不可修改                               |
| **修改行为**   | 修改对象时，原对象会被修改               | 修改对象时，会创建一个新的对象                           |
| **常见类型**   | 列表、字典、集合、bytearray              | 整数、浮点数、字符串、元组、frozenset                    |
| **内存效率**   | 可变对象修改时不会创建新的内存块         | 不可变对象每次修改都会创建新的对象，可能导致内存开销较大 |
| **线程安全性** | 在多线程中共享时可能出现问题（需要同步） | 因为不可变性，天然是线程安全的                           |
| **哈希性**     | 可变对象通常不可哈希                     | 不可变对象是可哈希的（如元组和字符串可以作为字典的键）   |
| **示例**       | `list`, `dict`, `set`                    | `int`, `float`, `str`, `tuple`, `frozenset`              |

简单来说，可变类型能修改原对象的内容，而不可变类型修改时会创建新的对象。

# new 和 init 的区别

在 Python 中，`__new__` 和 `__init__` 是与对象创建和初始化相关的特殊方法，它们的作用和执行时机不同：

## 1. `__new__` 方法

- **作用**：负责创建对象，是类实例化过程的第一步。它会分配内存并返回新创建的对象实例。
- **执行时机**：在对象创建时，优先于 `__init__` 执行。
- **定义**：

    ```python
    def __new__(cls, *args, **kwargs):
        # cls 是当前准备实例化的类
        # 必须返回一个类的实例（通常使用 super().__new__(cls)）
    ```

- **特点**：
  - `__new__` 是一个类方法，由类调用。
  - 常用于实现单例模式或自定义对象的创建过程。
- **示例**：

    ```python
    class MyClass:
        def __new__(cls, *args, **kwargs):
            print("Executing __new__")
            instance = super().__new__(cls)
            return instance

        def __init__(self, value):
            print("Executing __init__")
            self.value = value

    obj = MyClass(42)
    # 输出：
    # Executing __new__
    # Executing __init__
    ```

## 2. `__init__` 方法

- **作用**：负责初始化对象，即为新创建的对象设置属性或执行其他初始化操作。
- **执行时机**：在对象创建后立即执行。
- **定义**：

    ```python
    def __init__(self, *args, **kwargs):
        # self 是新创建的实例对象
    ```

- **特点**：
  - `__init__` 是一个实例方法，由实例调用。
  - 用于设置对象的初始状态。
- **示例**：

    ```python
    class MyClass:
        def __init__(self, value):
            print("Initializing object")
            self.value = value

    obj = MyClass(42)
    # 输出：
    # Initializing object
    ```

## 对比总结

|              | `__new__`                      | `__init__`               |
| ------------ | ------------------------------ | ------------------------ |
| **方法**     | 类方法                         | 实例方法                 |
| **作用**     | 创建对象，分配内存             | 初始化对象，设置属性     |
| **调用时机** | 在对象创建之前                 | 在对象创建之后           |
| **参数**     | 接收类本身 (`cls`)             | 接收实例本身 (`self`)    |
| **返回值**   | 必须返回一个类的实例           | 无需返回值               |
| **常见用途** | 控制对象的创建过程，如单例模式 | 设置对象属性，初始化状态 |

当需要定制对象的创建逻辑时，可以重写 `__new__` 方法，并结合 `__init__` 方法完成对象的完整初始化。

# metaclass（元类）

在 Python 中，**元类（metaclass）** 是一种用于创建类的“类”。换句话说，元类是定义类的类。它控制着类的创建和行为，而类控制着实例的创建和行为。

元类的概念可以通过类和实例的关系来理解：

- 类是实例的模板。
- 元类是类的模板。

## 1. 元类的作用

元类控制类的创建过程。

通过元类，你可以在类被创建时定制类的行为、属性和方法。例如，你可以在类定义时自动添加方法、修改类的属性，或者动态地改变类的行为。

## 2. 如何定义元类

元类通常是继承自 `type` 类的。Python 中的所有类本质上都是 `type` 的实例。因此，`type` 本身就是一个元类，控制着类的创建。

- `type` 是 Python 内置的元类，它定义了类的创建规则。

元类的基本使用步骤：

1. 定义一个元类，继承自 `type`。
2. 在元类中重写 `__new__` 或 `__init__` 方法，用来定制类的创建过程。
3. 在定义类时，指定使用这个元类。

## 3. 元类的工作原理

在类被定义时，元类会对类进行“修改”。元类主要通过两个方法来定制类的行为：

- `__new__(cls, name, bases, dct) -> cls`：在类被创建时调用，用来创建类对象。
- `__init__(cls, name, bases, dct)`：在类对象创建后调用，可以用来对类进行初始化和修改。

## 4. 示例：使用元类

下面是一个使用元类的示例：

```python
# 定义一个元类
class MyMeta(type):
    def __new__(cls, name, bases, dct):
        # 自动添加一个类属性
        dct['class_name'] = name
        # 通过 super 调用 type 的 __new__ 方法，返回创建的类
        return super().__new__(cls, name, bases, dct)

# 使用 MyMeta 元类定义一个类
class MyClass(metaclass=MyMeta):
    pass

# 实例化 MyClass
obj = MyClass()

# 打印类属性 class_name
print(obj.class_name)  # 输出 'MyClass'
```

在上面的例子中，`MyMeta` 是一个元类，它在创建 `MyClass` 类时，自动添加了一个 `class_name` 属性。

## 5. 元类的应用场景

- **类的自动创建**：元类可以在类创建时，自动生成或修改类的属性和方法。例如，自动添加一些通用的工具方法。
- **验证类定义**：元类可以检查类的定义是否符合特定要求，例如，确保类具有某些方法或属性。
- **类的继承控制**：元类可以控制类的继承关系，修改继承自父类的行为。
- **Singleton 模式**：通过元类，可以实现单例模式，确保一个类只有一个实例。

## 6. 更复杂的元类示例

```python
# 定义一个元类
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        # 检查是否已经创建实例
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

# 使用 SingletonMeta 元类实现单例模式
class SingletonClass(metaclass=SingletonMeta):
    pass

# 创建两个实例
a = SingletonClass()
b = SingletonClass()

print(a is b)  # 输出 True，说明 a 和 b 是同一个实例
```

在这个例子中，`SingletonMeta` 是一个元类，它确保 `SingletonClass` 只有一个实例。

## 7. 总结

- **元类**是用来创建类的类，它可以定制类的行为、属性等。
- 元类本质上是 Python 中的一个强大工具，能够在类的创建过程中动态修改类。
- 元类通常继承自 `type`，并通过重写 `__new__` 和 `__init__` 来修改类的创建和初始化行为。
- 元类在一些高级应用中非常有用，比如实现单例模式、自动生成代码、验证类结构等。

# 闭包

闭包（closure）是指一个函数可以“记住”并访问它定义时的作用域中的变量，即使这个函数在其定义的作用域之外被调用。简单来说，闭包是一个包含有外部作用域变量的函数。

在 Python 中，闭包的形成通常需要满足以下条件：

1. **有一个嵌套函数**：一个函数在另一个函数内部定义。
2. **嵌套函数引用了外部函数的变量**：内部函数使用了外部函数的局部变量。
3. **外部函数返回内部函数**：外部函数返回的是内部函数，而不是直接执行它。

## 举个例子：

```python
def outer_function(x):
    def inner_function(y):
        return x + y  # 这里的 x 是 outer_function 的局部变量
    return inner_function  # 返回 inner_function 函数对象

closure = outer_function(10)  # 调用外部函数，传入 10
print(closure(5))  # 调用返回的函数，并传入 5，结果是 15
```

### 解释：

1. `outer_function` 定义了一个局部变量 `x`，并返回了 `inner_function`。
2. `inner_function` 使用了外部函数 `outer_function` 的局部变量 `x`。
3. 当我们调用 `outer_function(10)` 时，返回了 `inner_function` 函数对象，并且这个函数“记住了” `x=10`。
4. 即使 `outer_function` 已经执行完毕，`inner_function` 依然能够访问到 `x` 的值。

这就是闭包的基本特性：即使外部函数的作用域已经结束，内部函数仍然可以访问外部函数的变量。

闭包常用于延迟计算、封装函数、装饰器等场景中。

# 装饰器

Python 中的装饰器（decorator）是一种用于修改或增强函数或方法功能的设计模式。装饰器允许你在不修改原始函数代码的情况下，动态地为函数添加功能。它通常用来增强或扩展已有函数的功能，比如添加日志、权限检查、缓存等。

装饰器的基本原理是，装饰器本质上是一个函数，它接受一个函数作为参数，并返回一个新的函数。装饰器可以通过`@decorator_name`的语法来应用。

## 装饰器的基本语法

```python
def decorator(func):
    def wrapper():
        print("Before function call")
        func()
        print("After function call")
    return wrapper

@decorator
def say_hello():
    print("Hello, World!")

say_hello()
```

输出：

```text
Before function call
Hello, World!
After function call
```

解释： 8. `decorator`是装饰器函数，它接受一个函数`func`作为参数。 9. `wrapper`是一个封装了`func`的函数，在它内部你可以添加额外的逻辑。 10. `@decorator`语法相当于`func = decorator(func)`，即在不修改`func`的情况下增强其功能。 11. 当你调用`say_hello()`时，实际调用的是`wrapper()`，它会先执行一些自定义逻辑，然后再执行原始的`func()`。

## 带参数的装饰器

```python
import time
import functools

def cost(cost=True):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            print('calling decorated function')
            t1 = time.time()
            result = func(*args, **kwargs)
            t2 = time.time()
            if cost:
                print('%s function cost: %s ms' % (func.__name__, (t2 - t1) * 1000))
            return result
        return wrapper
    return decorator


@cost()
def add(x, y):
    print('calling add function')
    return x + y
   
# add(1, 2) 相当于执行 cost(cost=True)(add)(1, 2)
```

## 装饰器的多个嵌套使用

你可以同时使用多个装饰器来装饰同一个函数。

> [!NOTE] > **靠近原函数的先进行装饰后执行，离原函数远的后装饰先执行**

```python
def decorator1(func):
    print('Decorator 1')
    def wrapper1(*args, **kwargs):
        print("这是第一个装饰器")
        return func(*args, **kwargs)
    return wrapper1


def decorator2(func):
    print('Decorator 2')
    def wrapper2(*args, **kwargs):
        print("这是第二个装饰器")
        return func(*args, **kwargs)
    return wrapper2


@decorator1  # 此处即 test = decorator1(decorator2(test))
@decorator2  # 此处即 test = decorator2(test)
def test():
    print("这是原函数")


test()
```

输出：

```text
Decorator 2
Decorator 1
这是第一个装饰器
这是第二个装饰器
这是原函数
```

## 使用`functools.wraps`保留原函数的信息

当使用装饰器时，原函数的元数据（如函数名、文档字符串等）会丢失。为了保留这些信息，可以使用`functools.wraps`。

```python
from functools import wraps

def decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print("Before function call")
        return func(*args, **kwargs)
    return wrapper

@decorator
def say_hello():
    """This is a greeting function."""
    print("Hello, World!")

print(say_hello.__name__)  # 输出: say_hello
print(say_hello.__doc__)   # 输出: This is a greeting function.
```

## 总结

- **装饰器**是一个函数，它用于修改或增强其他函数的功能。
- 使用`@decorator`语法来应用装饰器。
- 装饰器可以自定义传入参数。
- 通过`functools.wraps`可以保留原函数的元数据。

# 单例模式

在 Python 中，**单例模式**确保一个类只有一个实例，并提供全局访问点。实现单例模式的方法有几种，以下是几种常见的方法：

## 1. 使用类的 `__new__` 方法

`__new__` 方法用于控制类的实例化过程。通过重写 `__new__` 方法，可以确保类只创建一个实例。

```python
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Singleton, cls).__new__(cls)
        return cls._instance

# 测试
a = Singleton()
b = Singleton()
print(a is b)  # 输出: True，a 和 b 是同一个实例
```

## 2. 使用装饰器

可以使用装饰器来实现单例模式，通过缓存类的实例来确保只创建一个实例。

```python
def singleton(cls):
    instances = {}
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper

@singleton
class Singleton:
    pass

# 测试
a = Singleton()
b = Singleton()
print(a is b)  # 输出: True，a 和 b 是同一个实例
```

## 3. 使用元类

通过定义元类来控制类的创建过程，确保类只有一个实例。

```python
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Singleton(metaclass=SingletonMeta):
    pass

# 测试
a = Singleton()
b = Singleton()
print(a is b)  # 输出: True，a 和 b 是同一个实例
```

## 4. 使用 `import`

```python
# singleton.py
class My_Singleton(object):
    pass


my_singleton = My_Singleton()


# use
from singleton import my_singleton

```

## 总结

- **`__new__` 方法**：最常用的单例模式实现，确保只有一个实例。
- **装饰器**：通过缓存实例并返回同一实例实现单例。
- **元类**：通过重写元类的 `__call__` 方法，确保类实例唯一。
- 使用 import。

# 迭代器

在 Python 中，**迭代器**（iterator）是一种可以逐个遍历对象元素的对象。任何实现了 `__iter__()` 方法和 `__next__()` 方法的对象都可以称为迭代器。迭代器使得我们可以通过 `for` 循环或显式调用 `next()` 函数来依次访问集合中的元素。

## 迭代器的基本概念

- **可迭代对象**（Iterable）：是一个可以返回一个迭代器的对象。比如，列表、元组、字典、字符串等都可以作为可迭代对象。可迭代对象需要实现 `__iter__()` 方法。
- **迭代器对象**（Iterator）：是一个实现了 `__iter__()` 方法并且有 `__next__()` 方法的对象。通过 `__next__()` 方法可以获取下一个元素，直到没有元素为止（此时会抛出 `StopIteration` 异常）。

## 创建迭代器

当我们通过 `iter()` 函数将一个可迭代对象转换为迭代器时，它会返回一个实现了 `__iter__()` 和 `__next__()` 方法的对象。

## 示例：

```python
# 可迭代对象：列表
my_list = [1, 2, 3]

# 将列表转换为迭代器
my_iterator = iter(my_list)

# 使用 next() 获取迭代器的元素
print(next(my_iterator))  # 输出: 1
print(next(my_iterator))  # 输出: 2
print(next(my_iterator))  # 输出: 3
# 再调用 next() 会抛出 StopIteration 异常
print(next(my_iterator))  # 抛出 StopIteration 异常
```

在 `for` 循环中，Python 会自动处理迭代器和 `StopIteration` 异常：

```python
for item in my_list:
    print(item)
```

## 迭代器的实现

你可以自定义一个迭代器类，必须实现 `__iter__()` 和 `__next__()` 方法。`__iter__()` 返回迭代器对象本身，`__next__()` 返回下一个元素，并在遍历完所有元素后抛出 `StopIteration` 异常。

```python
class MyIterator:
    def __init__(self, start, end):
        self.current = start
        self.end = end

    def __iter__(self):
        return self  # 返回迭代器对象本身

    def __next__(self):
        if self.current >= self.end:
            raise StopIteration  # 当迭代结束时抛出异常
        self.current += 1
        return self.current - 1

# 创建迭代器
my_iter = MyIterator(0, 5)

# 使用迭代器
for num in my_iter:
    print(num)
```

输出：

```text
0
1
2
3
4
```

## 总结

- 迭代器是实现了 `__iter__()` 和 `__next__()` 方法的对象。
- `__iter__()` 方法返回迭代器对象本身，`__next__()` 方法返回下一个元素，直到遍历完所有元素时抛出 `StopIteration` 异常。
- 你可以通过 `iter()` 函数将一个可迭代对象转换为迭代器，并通过 `next()` 函数或 `for` 循环逐个访问其元素。

# 生成器

在 Python 中，**生成器**（generator）是一种特殊类型的迭代器，它通过一种惰性求值的方式来逐步生成值。生成器不像普通函数那样返回一个值，而是使用 `yield` 关键字逐步返回多个值，每次返回一个值时，函数的执行状态会被暂停，下一次调用时会从上次暂停的位置继续执行。

生成器可以用来节省内存，尤其在处理大型数据时非常有用，因为它不会一次性把所有数据加载到内存中，而是每次生成一个数据。

## 生成器的创建

生成器有两种常见的创建方式：

1. **生成器函数**：使用 `yield` 关键字。
2. **生成器表达式**：类似列表推导式，但使用小括号。

## 1. 生成器函数

生成器函数看起来和普通函数一样，不同之处在于它使用了 `yield` 来返回值，而不是 `return`。

### 示例：

```python
def my_generator():
    yield 1
    yield 2
    yield 3

gen = my_generator()

# 使用 next() 函数获取生成器的下一个值
print(next(gen))  # 输出: 1
print(next(gen))  # 输出: 2
print(next(gen))  # 输出: 3

# 再调用 next() 会抛出 StopIteration 异常
print(next(gen))  # 抛出 StopIteration 异常
```

### 解释：

- 每次调用 `next()` 时，生成器函数从 `yield` 表达式处恢复执行，并返回一个新的值。
- 当没有更多值可以生成时，生成器会抛出 `StopIteration` 异常。

## 2. 生成器表达式

生成器表达式的语法类似于列表推导式，但是它使用圆括号 `()` 来创建生成器，而不是方括号 `[]`。

### 示例：

```python
gen = (x * x for x in range(5))

# 使用 next() 获取生成器的值
print(next(gen))  # 输出: 0
print(next(gen))  # 输出: 1
print(next(gen))  # 输出: 4
print(next(gen))  # 输出: 9
print(next(gen))  # 输出: 16

# 再调用 next() 会抛出 StopIteration 异常
print(next(gen))  # 抛出 StopIteration 异常
```

### 解释：

- 生成器表达式返回一个生成器对象，该对象可以按需生成值，节省内存。
- 同样，使用 `next()` 可以依次获取生成器中的元素，直到没有更多元素时抛出 `StopIteration`。

## 生成器的优势

1. **内存节省**：生成器一次生成一个值，不会将所有数据保存在内存中，因此特别适合处理大数据集或流数据。
2. **惰性求值**：生成器只有在需要时才会计算下一个值，因此对于某些操作来说，性能更高。
3. **简洁易懂**：生成器函数和生成器表达式比传统的迭代器更简洁，减少了额外的代码。

## 总结

- **生成器** 是一种特殊的迭代器，使用 `yield` 来生成一个值，直到生成器没有更多值时抛出 `StopIteration` 异常。
- 生成器节省内存并支持惰性求值，特别适合处理大规模数据或流数据。
- 可以通过生成器函数或生成器表达式来创建生成器。
- 生成器的优点包括内存高效、性能优越和代码简洁。

# GIL

在 Python 中，GIL（全局解释器锁，Global Interpreter Lock）是 CPython 解释器（Python 的默认实现）采用的一种机制，用于确保同一时刻仅有一个线程执行 Python 字节码。以下是关于 GIL 的详细总结：

## GIL 的核心作用

1. **线程安全**：

   - CPython 使用引用计数来管理内存，而 GIL 的存在避免了多线程同时修改对象引用计数导致的竞争条件（Race Condition），从而简化了内存管理和内置数据结构的线程安全实现。
   - 无需为每个对象单独加锁，降低了代码复杂性。

2. **单线程执行**：
   - 无论有多少个线程或 CPU 核心，GIL 强制同一时间只有一个线程能执行 Python 字节码，其他线程需等待锁的释放。

## GIL 的影响

1. **多线程性能瓶颈**：

   - **CPU 密集型任务**：多线程无法利用多核 CPU 并行计算（例如数值计算），性能可能不如单线程甚至多进程。
   - **I/O 密集型任务**：影响较小，因为线程在等待 I/O（如文件读写、网络请求）时会主动释放 GIL，允许其他线程运行。

2. **替代方案**：
   - **多进程（`multiprocessing`模块）**：每个进程有独立的 GIL，可绕过限制，充分利用多核。
   - **异步编程（`asyncio`等）**：单线程内通过协程处理高并发 I/O 任务，避免线程切换开销。
   - **C 扩展**：在 C 语言层释放 GIL（如 NumPy、Cython 中的`with nogil`块），实现并行计算。
   - **其他解释器**：Jython（基于 JVM）或 IronPython（基于.NET）没有 GIL，但生态支持较弱。

## GIL 存在的原因

- **历史与兼容性**：CPython 早期依赖 GIL 简化设计，后续移除会导致破坏性变更，影响大量 C 扩展和单线程性能。
- **实现复杂性**：无 GIL 的线程安全需对内存管理和核心对象进行细粒度加锁，可能增加复杂性和性能开销。

## 争议与未来

- **社区讨论**：Python 社区多次尝试移除 GIL（如 Python 3.2 的`gilectomy`项目），但常因性能损失或兼容性问题未成功。
- **潜在改进**：Python 3.12 引入的“无 GIL 构建选项”（PEP 703）是实验性尝试，允许在编译时禁用 GIL，但尚未成为默认行为。

## 总结

- **适用场景**：
  - 多线程适合 I/O 密集型任务（如网络请求、文件处理）。
  - 多进程或混合编程（C 扩展）适合 CPU 密集型任务。
- **设计权衡**：GIL 以多核并行性为代价，换取了 CPython 实现的简洁与线程安全。

通过理解 GIL 的机制及其影响，开发者可以合理选择并发模型，优化 Python 程序性能。

# 浅拷贝和深拷贝的区别

在 Python 中，浅拷贝和深拷贝是两种不同的复制对象的方法，它们主要区别在于对可变对象的处理。

## 1. 浅拷贝（Shallow Copy）

- **定义**：浅拷贝会创建一个新的对象，但新的对象中包含的元素是对原对象中元素的引用（即指向相同的内存地址）。
- **实现方式**：可以使用以下方法实现浅拷贝：
  - `copy.copy()` 方法（需要导入 `copy` 模块）
  - `[:]` 切片操作（适用于列表等序列类型）
  - `list()`、`dict()` 构造函数（对于列表和字典）
- **特点**：

  - 对于不可变对象（如数字、字符串、元组），浅拷贝和原对象共享相同的值。
  - 对于可变对象（如列表、字典），浅拷贝和原对象的嵌套对象共享引用，修改嵌套对象会影响到原对象。

- **示例**：

```python
import copy

original = [1, 2, [3, 4]]
shallow_copy = copy.copy(original)

# 修改嵌套对象
shallow_copy[2][0] = 99
print(original)       # 输出：[1, 2, [99, 4]]，原对象受到影响
print(shallow_copy)   # 输出：[1, 2, [99, 4]]
```

## 2. 深拷贝（Deep Copy）

- **定义**：深拷贝会递归地复制原对象及其所有嵌套对象，创建一个完全独立的新对象。
- **实现方式**：使用 `copy.deepcopy()` 方法（需要导入 `copy` 模块）。
- **特点**：
  - 深拷贝的对象与原对象完全独立。
  - 修改深拷贝对象的任何部分（包括嵌套对象）都不会影响原对象。
- **示例**：

```python
import copy

original = [1, 2, [3, 4]]
deep_copy = copy.deepcopy(original)

# 修改嵌套对象
deep_copy[2][0] = 99
print(original)       # 输出：[1, 2, [3, 4]]，原对象未受影响
print(deep_copy)      # 输出：[1, 2, [99, 4]]
```

## 对比总结

| 特性                 | 浅拷贝                     | 深拷贝               |
| -------------------- | -------------------------- | -------------------- |
| 是否创建新对象       | 是                         | 是                   |
| 是否递归复制嵌套对象 | 否，仅复制引用             | 是，递归复制嵌套对象 |
| 是否独立于原对象     | 部分独立（嵌套对象不独立） | 完全独立             |
| 适用场景             | 不需要修改嵌套对象         | 嵌套对象需要独立     |

如果处理的数据结构中包含嵌套的可变对象，并且需要确保独立性，应优先选择**深拷贝**。

# 协程、线程和进程

协程、进程和线程是实现并发的三种不同机制，它们各自的特点、运行方式和适用场景不同。

## 1. 什么是协程？

**协程（Coroutine）** 是一种用户态的轻量级线程，可以在单线程中实现并发。它由程序显式控制任务的切换，不依赖于操作系统的调度。

- **特点**：
    1. **协作式调度**：协程主动让出控制权（通过 `await` 或 `yield`），任务间的切换是手动调度的。
    2. **单线程运行**：多个协程共享一个线程，不能并行。
    3. **高效**：由于没有线程上下文切换和锁机制，开销比线程小。
    4. **非阻塞**：适合 I/O 密集型任务，如网络请求、文件操作。
- **协程示例（Python）**：

    ```python
    import asyncio

    async def task1():
        print("Task 1: Start")
        await asyncio.sleep(1)  # 模拟异步 I/O
        print("Task 1: End")

    async def task2():
        print("Task 2: Start")
        await asyncio.sleep(2)
        print("Task 2: End")

    asyncio.run(asyncio.gather(task1(), task2()))
    # 输出：
    # Task 1: Start
    # Task 2: Start
    # Task 1: End
    # Task 2: End
    ```

## 2. 什么是线程？

**线程（Thread）** 是操作系统调度的基本单位，一个进程可以包含多个线程。线程共享进程的内存空间和资源。

- **特点**：
    1. **内存共享**：线程间可以共享数据，但需要加锁来防止竞争条件（如 `threading.Lock`）。
    2. **并发**：在 Python 中受限于 GIL（全局解释器锁），多个线程在同一时刻只能有一个线程执行 Python 字节码。
    3. **适用场景**：I/O 密集型任务。
- **线程示例（Python）**：

    ```python
    import threading
    import time

    def task(name):
        print(f"{name}: Start")
        time.sleep(1)
        print(f"{name}: End")

    t1 = threading.Thread(target=task, args=("Thread 1",))
    t2 = threading.Thread(target=task, args=("Thread 2",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    ```

## 3. 什么是进程？

**进程（Process）** 是操作系统资源分配的基本单位，每个进程有独立的内存空间。进程之间通过 IPC（进程间通信）进行数据传递。

- **特点**：
    1. **独立性**：进程之间彼此隔离，互不影响。
    2. **并行**：多个进程可以在多核 CPU 上真正实现并行。
    3. **适用场景**：CPU 密集型任务。
- **进程示例（Python）**：

    ```python
    from multiprocessing import Process
    import time

    def task(name):
        print(f"{name}: Start")
        time.sleep(1)
        print(f"{name}: End")

    p1 = Process(target=task, args=("Process 1",))
    p2 = Process(target=task, args=("Process 2",))
    p1.start()
    p2.start()
    p1.join()
    p2.join()
    ```

## 4. 协程、线程和进程的对比

| **特性**           | **协程**                     | **线程**                     | **进程**                           |
| ------------------ | ---------------------------- | ---------------------------- | ---------------------------------- |
| **并发/并行**      | 并发（单线程内切换）         | 并发（受 GIL 限制）          | 并行（可利用多核 CPU）             |
| **调度方式**       | 协作式调度（主动让出控制权） | 操作系统调度                 | 操作系统调度                       |
| **内存空间**       | 共享同一线程的内存空间       | 共享同一进程的内存空间       | 独立内存空间                       |
| **上下文切换开销** | 最低                         | 较低                         | 较高                               |
| **适用场景**       | I/O 密集型任务（如网络请求） | I/O 密集型任务（如文件读写） | CPU 密集型任务（如计算密集型程序） |
| **数据安全性**     | 无需锁                       | 需要加锁防止线程竞争         | 数据隔离，安全性高                 |

## 5. 总结

- **协程**：在单线程内实现高效并发，适用于 I/O 密集型任务，轻量但不能并行。
- **线程**：操作系统管理的并发单元，适合 I/O 密集型任务，但在 Python 中受 GIL 限制，无法利用多核。
- **进程**：独立的并行执行单元，适用于 CPU 密集型任务，开销大但性能强。
