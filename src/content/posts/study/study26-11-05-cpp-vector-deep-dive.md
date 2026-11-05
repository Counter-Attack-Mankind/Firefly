---
title: C++ 学习笔记 06：深入 std::vector——容量、引用失效与轨迹管理
published: 2026-11-05
description: 深入理解 C++ std::vector 的 size 与 capacity、reserve 与 resize、元素插入删除、引用失效、函数传参与返回值，并结合轨迹数据管理梳理常见错误。
tags: [C++ 学习, C++, std::vector, 容器, 引用失效]
category: C++ 学习
draft: false
---

上一篇学习了 `std::vector` 的基本使用，本篇继续讨论它更容易出错、也更接近工程实践的部分：容量管理、结构性修改、引用失效，以及怎样为轨迹数据设计清晰的函数接口。

## 1. vector 的三个核心概念

`std::vector` 是一个动态数组容器。它的元素在内存中连续存放，因此既能通过下标快速访问，也能在需要时自动申请更大的存储空间。

使用 vector 时，需要分清下面三个概念：

- `size()`：当前实际存在的元素数量；
- `capacity()`：当前已分配空间最多能够容纳的元素数量；
- 有效下标范围：`[0, size())`，与 `capacity()` 无关。

它们始终满足：

```text
size() <= capacity()
```

例如：

```cpp
#include <vector>

std::vector<double> path;

path.reserve(5);      // size() == 0，capacity() >= 5
path.push_back(0.1);  // size() == 1
path.push_back(0.2);  // size() == 2
```

虽然 `reserve(5)` 预留了至少五个元素的空间，但此时容器仍然是空的。第一次 `push_back()` 添加的 `0.1` 是第一个有效元素，而不是第六个元素。

## 2. reserve 与 resize 的区别

`reserve()` 和 `resize()` 都可能改变 vector 的内部存储，但它们表达的是完全不同的意图。

| 操作 | 改变 `size()` | 可能改变 `capacity()` | 是否创建元素 |
| --- | --- | --- | --- |
| `reserve(n)` | 否 | 是 | 否 |
| `resize(n)` | 是 | 是 | 是，或删除末尾元素 |

### reserve：只预留空间

```cpp
std::vector<double> path;
path.reserve(5);
```

`reserve(5)` 保证容器至少能够在不重新分配的情况下容纳五个元素。它不会创建任何有效元素，也不会改变 `size()`。

如果当前容量已经不小于 5，这次调用通常不会产生变化。

### resize：改变有效元素数量

```cpp
std::vector<double> path{0.1, 0.2};
path.resize(4);
```

执行后，vector 中有四个元素：

```text
0.1 0.2 0.0 0.0
```

对于 `double`，新增元素会被值初始化为 `0.0`。也可以显式指定新元素的初始值：

```cpp
path.resize(6, -1.0);
```

如果新的大小小于原来的 `size()`，末尾多余的元素会被删除，但 vector 不保证同时缩小 `capacity()`。

### 应该选择哪一个

- 已知最终需要固定数量的元素，并准备通过下标逐个赋值：使用 `resize(n)`；
- 只知道数量上限或估计值，实际元素数量由运行结果决定：使用 `reserve(n)` 配合 `push_back()`。

例如，生成固定数量的预测点：

```cpp
std::vector<double> speeds;
speeds.resize(sample_count);

for (std::size_t i{0}; i < speeds.size(); ++i)
{
    speeds[i] = calculateSpeed(i);
}
```

而筛选满足条件的路径点时，更适合：

```cpp
std::vector<double> valid_points;
valid_points.reserve(source.size());

for (const auto point : source)
{
    if (isValid(point))
    {
        valid_points.push_back(point);
    }
}
```

## 3. 元素访问与修改

vector 提供了多种访问和修改元素的接口：

| 操作 | 作用 | 使用前提或风险 |
| --- | --- | --- |
| `path[i]` | 访问下标 `i` 的元素 | 不检查越界 |
| `path.at(i)` | 带边界检查地访问元素 | 越界时抛出 `std::out_of_range` |
| `path.front()` | 访问第一个元素 | 容器必须非空 |
| `path.back()` | 访问最后一个元素 | 容器必须非空 |
| `path.push_back(x)` | 在末尾添加元素 | 可能触发扩容 |
| `path.pop_back()` | 删除最后一个元素 | 容器必须非空，不返回被删除值 |
| `path.clear()` | 删除所有元素 | `size()` 变为 0，容量通常保留 |
| `path.insert(pos, x)` | 在 `pos` 前插入元素 | 可能移动元素或触发扩容 |
| `path.erase(pos)` | 删除 `pos` 指向的元素 | 后续元素会向前移动 |

一个完整的修改过程如下：

```cpp
std::vector<double> path{0.1, 0.2, 0.3};

path.front() = 0.0;                  // {0.0, 0.2, 0.3}
path.back() = 0.5;                   // {0.0, 0.2, 0.5}
path.insert(path.begin() + 1, 0.1);  // {0.0, 0.1, 0.2, 0.5}
path.erase(path.begin() + 2);        // {0.0, 0.1, 0.5}
path.pop_back();                     // {0.0, 0.1}
```

`begin()` 返回指向第一个元素的迭代器，因此 `path.begin() + i` 可以表示第 `i` 个位置。调用 `front()`、`back()` 或 `pop_back()` 前，最好先检查：

```cpp
if (!path.empty())
{
    std::cout << path.back() << '\n';
    path.pop_back();
}
```

## 4. 连续存储与重新分配

vector 的元素连续存储，这让它具备较好的缓存局部性，也能与需要连续内存的接口配合使用：

```cpp
double* first{path.data()};
```

但是，当已有容量不足以容纳新元素时，vector 需要：

1. 申请一块更大的连续内存；
2. 把已有元素移动或复制到新位置；
3. 释放原来的存储空间。

这个过程称为重新分配。C++ 标准并没有规定 vector 每次扩容的具体增长倍数，因此不能依赖某个固定的容量变化规律。

如果能够提前估计元素数量，`reserve()` 可以减少重复分配和搬移元素的次数。但它是一种性能优化，不应被误认为创建元素的操作。

## 5. 什么是引用失效

如果保存了 vector 元素的引用、指针或迭代器，之后又对容器进行结构性修改，这些访问手段可能不再指向合法对象。这就是引用或迭代器失效。

最直接的例子是删除被引用的元素：

```cpp
std::vector<double> path{0.1, 0.2, 0.3};
double& target{path[2]};

path.pop_back();
```

`target` 原本引用最后一个元素，而这个元素已经被删除。此时 `target` 成为悬空引用，继续读取或写入都会产生未定义行为。

常见操作的失效规则可以归纳为：

| 操作 | 对已有引用、指针和迭代器的影响 |
| --- | --- |
| 修改 `path[i]` 的值 | 不使其他元素的引用失效 |
| `push_back()` 未触发扩容 | 原有元素的引用保持有效，但原来的尾后迭代器失效 |
| `push_back()` 触发扩容 | 所有元素的引用、指针和迭代器失效 |
| `insert()` 触发扩容 | 全部失效 |
| `insert()` 未触发扩容 | 插入位置之前保持有效，插入位置及之后失效 |
| `erase()` | 删除位置及之后失效 |
| `pop_back()` | 被删除元素及原来的尾后迭代器失效 |
| `clear()` | 所有元素引用、指针和迭代器失效 |
| `reserve()` 触发重新分配 | 全部失效 |
| `resize()` 缩小 | 被删除元素及其后的访问手段失效 |
| `resize()` 增大 | 若触发扩容则全部失效，否则原有元素引用保持有效 |

这里有两个容易混淆的结论：

- `size()` 改变，不代表一定发生了重新分配；
- 没有重新分配，也不代表所有引用都仍然有效。

例如 `erase()` 通常不需要重新分配内存，但删除位置之后的元素会向前移动，所以相关引用和迭代器仍然失效。

## 6. 容器修改后，不要盲目信任旧引用

在轨迹规划中，程序可能一边遍历轨迹点，一边插入、裁剪或删除元素。这时不应长期保存某个元素的引用：

```cpp
auto& point{trajectory[index]};

trajectory.push_back(new_point);  // 可能扩容

point.speed = 0.0;                // point 可能已经悬空
```

更安全的方式是在修改容器后重新检查下标，再重新访问元素：

```cpp
trajectory.push_back(new_point);

if (index < trajectory.size())
{
    trajectory[index].speed = 0.0;
}
```

不过，下标仍然合法只说明访问不会越界，并不保证它还代表修改前的同一个逻辑轨迹点。插入或删除发生在该位置之前时，元素对应关系也可能改变。

因此，工程中还需要根据业务语义决定是否使用唯一标识、重新查找目标，或把容器修改与元素处理拆分成不同阶段。

## 7. 复制、引用与函数接口

复制 vector 会创建一个独立容器：

```cpp
std::vector<double> path1{0.1, 0.2};
std::vector<double> path2{path1};

path2[0] = 0.8;
// path1[0] 仍然是 0.1
```

而引用是原容器的别名：

```cpp
std::vector<double>& alias{path1};
alias[0] = 0.5;
// path1[0] 也变成 0.5
```

设计函数参数时，主要考虑两个问题：函数是否需要修改调用者的数据，以及复制对象的成本。

```cpp
void printSpeed(double speed);                    // 小对象：值传递
void printPath(const std::vector<double>& path);  // 大型只读对象：const 引用
void modifyPath(std::vector<double>& path);       // 需要修改原对象：非 const 引用
std::vector<double> generatePath();               // 创建新结果：按值返回
```

`const std::vector<double>&` 同时表达两件事：

- `&` 避免复制整个容器；
- `const` 禁止函数通过该引用修改容器。

不过，`const&` 并不是所有参数的固定答案。对于 `int`、`double` 等复制成本很低的基本类型，直接值传递通常更清晰。

### 可以按值返回局部 vector

```cpp
std::vector<double> generatePath()
{
    std::vector<double> path{0.1, 0.2};
    return path;
}
```

这种写法是安全的。编译器可以通过返回值优化或移动语义减少不必要的复制。

不能返回局部容器的引用：

```cpp
const std::vector<double>& generatePath()  // 错误示例
{
    std::vector<double> path{0.1, 0.2};
    return path;
}
```

函数结束时，局部变量 `path` 被销毁，返回的引用会立即悬空。

## 8. 用 vector 管理轨迹点

真实轨迹点通常包含位置、速度、航向角等多个字段，可以先使用结构体描述一个点，再用 vector 表示整条轨迹：

```cpp
struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

using Trajectory = std::vector<TrajectoryPoint>;
```

创建轨迹并添加数据：

```cpp
Trajectory trajectory;
trajectory.reserve(10);

trajectory.push_back({0.0, 0.0, 0.18});
trajectory.push_back({0.2, 0.1, 0.28});
```

### 原地修改轨迹

```cpp
void limitTrajectory(Trajectory& path, double max_speed)
{
    for (auto& point : path)
    {
        if (point.speed > max_speed)
        {
            point.speed = max_speed;
        }
    }
}
```

这里必须使用 `auto& point`。如果写成 `auto point`，循环变量只是元素副本，对它的修改不会作用于 vector 中的原始轨迹点。

### 生成一条独立的新轨迹

如果需要保留原始轨迹，可以复制容器，再复用原地修改函数：

```cpp
Trajectory createLimitedTrajectory(
    const Trajectory& path,
    double max_speed)
{
    Trajectory result{path};
    limitTrajectory(result, max_speed);
    return result;
}
```

这种接口明确区分了两种语义：

- `limitTrajectory()` 修改调用者传入的轨迹；
- `createLimitedTrajectory()` 保留原数据并返回新结果。

这比在两个函数中分别实现一遍限速逻辑更容易维护。

## 9. 本次学习中的典型错误

### 误以为 reserve 会创建元素

```cpp
std::vector<double> path;
path.reserve(5);
path.push_back(0.1);
```

结果只有一个元素，`0.1` 位于下标 0。`reserve()` 只预留容量，只有 `resize(5)` 才会先创建五个有效元素。

### 误判 erase 后的引用状态

删除下标 1 的元素后，原本指向下标 2 的引用不会自动、可靠地重新绑定到另一个逻辑元素。`erase()` 会使删除位置及之后的引用和迭代器失效，而删除位置之前的仍然有效。

### 在范围 for 中忘记引用

```cpp
for (auto point : path)
{
    point.speed = 0.0;  // 只修改副本
}
```

需要修改原元素时，应写成：

```cpp
for (auto& point : path)
{
    point.speed = 0.0;
}
```

函数形参是否使用引用，与范围 for 的循环变量是否使用引用是两件独立的事，不能相互替代。

### 初始化函数重复追加

如果初始化函数内部只有 `push_back()`，连续调用两次就会把新数据追加到旧数据之后：

```cpp
void initialize(Trajectory& path)
{
    path.clear();
    path.reserve(4);

    path.push_back({0.0, 0.0, 0.1});
    path.push_back({0.1, 0.0, 0.2});
}
```

函数名和实现应保持一致：如果语义是“重新初始化”，先清空旧数据；如果语义是“追加”，则不要清空，并在命名中体现这一点。

### 使用 int 与 size() 比较

```cpp
for (int i{0}; i < path.size(); ++i)
```

`vector::size()` 返回无符号的大小类型，与有符号的 `int` 比较可能触发 `-Wsign-compare` 警告。正向遍历可以写成：

```cpp
for (std::size_t i{0}; i < path.size(); ++i)
{
    std::cout << path[i].speed << '\n';
}
```

但无符号整数不能表示负数，所以倒序遍历时不要写 `i >= 0`。一种安全写法是：

```cpp
for (std::size_t i{path.size()}; i-- > 0;)
{
    std::cout << path[i].speed << '\n';
}
```

## 10. 一份完整的轨迹处理示例

下面的程序创建原始轨迹，生成一条限速后的独立轨迹，并输出结果：

```cpp
#include <iostream>
#include <vector>

struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

using Trajectory = std::vector<TrajectoryPoint>;

void limitTrajectory(Trajectory& path, double max_speed)
{
    for (auto& point : path)
    {
        if (point.speed > max_speed)
        {
            point.speed = max_speed;
        }
    }
}

Trajectory createLimitedTrajectory(
    const Trajectory& path,
    double max_speed)
{
    Trajectory result{path};
    limitTrajectory(result, max_speed);
    return result;
}

void printTrajectory(const Trajectory& path)
{
    for (std::size_t i{0}; i < path.size(); ++i)
    {
        const auto& point{path[i]};

        std::cout
            << i << ": ("
            << point.x << ", "
            << point.y << "), speed = "
            << point.speed << '\n';
    }
}

int main()
{
    Trajectory original;
    original.reserve(4);

    original.push_back({0.0, 0.0, 0.18});
    original.push_back({0.2, 0.1, 0.28});
    original.push_back({0.4, 0.2, 0.32});
    original.push_back({0.6, 0.2, 0.20});

    const Trajectory limited{
        createLimitedTrajectory(original, 0.26)
    };

    std::cout << "Original:\n";
    printTrajectory(original);

    std::cout << "Limited:\n";
    printTrajectory(limited);

    return 0;
}
```

程序中包含几个值得保留的设计：

- 根据预估数量调用 `reserve()`，减少追加过程中的重新分配；
- 使用 `auto&` 原地修改轨迹点；
- 只读参数采用 `const&`，避免复制容器；
- 按值返回新轨迹，接口清晰且生命周期安全；
- 复制原轨迹后复用限速函数，避免重复代码。

## 11. 本篇总结

本次学习的核心不只是记住更多成员函数，而是理解 vector 的状态变化以及这些变化对程序安全性的影响：

- `size()` 表示有效元素数量，`capacity()` 表示已分配容量；
- `reserve()` 只预留空间，`resize()` 会改变有效元素数量；
- 有效下标范围永远由 `size()` 决定，而不是由 `capacity()` 决定；
- `insert()`、`erase()`、扩容等结构性修改可能使引用、指针和迭代器失效；
- 没有发生重新分配，不代表所有旧引用仍然有效；
- 大型只读容器通常使用 `const&` 传参，需要修改原容器时使用非 const 引用；
- 返回新容器时可以安全地按值返回，不能返回局部容器的引用；
- 范围 for 中的 `auto` 是副本，`auto&` 才能修改原元素；
- 轨迹数据可用“结构体 + vector”建模，并通过明确的接口区分原地修改和生成新结果。

理解这些规则后，`std::vector` 才不只是一个“可以自动扩容的数组”，而是能够在轨迹规划、路径处理和状态序列管理中安全使用的基础容器。
