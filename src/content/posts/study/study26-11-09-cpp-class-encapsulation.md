---
title: C++ 学习笔记 08：class、成员函数与封装设计
published: 2026-11-08T8:00:00+08:00
description: 学习 C++ 普通函数与成员函数的区别、struct 与 class、public 和 private、const 成员函数及类外定义，并通过 TrajectoryManager 实践轨迹数据的封装与接口设计。
tags: [C++ 学习, C++, class, 封装, 成员函数]
category: C++ 学习
draft: false
---

上一篇使用 `struct` 把车辆状态、轨迹点和规划配置组织成了不同的数据模型。本篇继续向前一步：让对象不仅保存数据，还通过成员函数管理数据，并利用 `class` 和访问权限保护对象内部的一致性。

这也是学习重点从“数据如何存放”转向“对象应该提供什么接口”的开始。

## 1. 普通函数与成员函数

普通函数独立于某个类型，必须通过参数告诉它要操作哪个对象：

```cpp
void limitSpeed(VehicleState& state, double max_speed)
{
    if (state.speed > max_speed)
    {
        state.speed = max_speed;
    }
}

limitSpeed(car, 0.3);
```

成员函数属于某个 `struct` 或 `class`，通过具体对象调用：

```cpp
struct VehicleState
{
    double speed{};

    void limitSpeed(double max_speed)
    {
        if (speed > max_speed)
        {
            speed = max_speed;
        }
    }
};

car.limitSpeed(0.3);
```

成员函数可以直接访问当前对象的成员，因此不需要把当前对象再次作为参数传入。

### 应该选择哪一种

成员函数适合表达与对象自身状态紧密相关的操作，例如：

- 更新车辆速度；
- 设置或清空内部轨迹；
- 对当前轨迹执行限速；
- 查询轨迹点数量；
- 判断当前对象是否为空或处于活动状态。

普通函数更适合表达不依赖某个对象内部状态的通用操作，例如计算任意两个点之间的欧氏距离：

```cpp
double distance(
    const TrajectoryPoint& lhs,
    const TrajectoryPoint& rhs);
```

成员函数并不一定修改数据。查询轨迹长度或最大速度也可以是成员函数，只是需要用 `const` 表达它的只读性质。

## 2. 成员函数中的当前对象

成员函数被某个对象调用时，函数内部会隐含地知道当前对象是谁。

```cpp
class TrajectoryManager
{
public:
    void clear()
    {
        trajectory_.clear();
    }

private:
    std::vector<TrajectoryPoint> trajectory_;
};
```

`clear()` 直接访问的是调用该函数的对象所拥有的 `trajectory_`。

成员函数内部也可以通过 `this` 指针显式表示当前对象：

```cpp
this->trajectory_.clear();
```

通常成员名称没有歧义时，直接写 `trajectory_` 更简洁。只有需要强调当前对象，或者成员名称被局部名称遮蔽时，才常见显式的 `this->`。

## 3. struct 与 class 的关系

在 C++ 中，`struct` 和 `class` 都可以拥有：

- 成员变量；
- 成员函数；
- `public`、`private` 等访问权限；
- 构造函数及其他面向对象特性。

两者最直接的语法差别之一是默认访问权限：

| 类型 | 默认成员访问权限 |
| --- | --- |
| `struct` | `public` |
| `class` | `private` |

例如：

```cpp
struct VehicleState
{
    double speed{};  // 默认 public
};

class Vehicle
{
    double speed_{}; // 默认 private
};
```

工程中通常使用 `struct` 表示以数据为主的简单模型，例如 `TrajectoryPoint`、`VehicleState` 和配置项；使用 `class` 表示拥有内部状态和较复杂操作的功能模块，例如 `TrajectoryManager`、`PathTrack` 和 `TaskAllocator`。

这是一种常见设计习惯，不是语言强制规定。真正需要考虑的是类型的职责和对外接口。

## 4. public、private 与封装

`public` 成员构成对象对外提供的接口，普通外部代码可以调用或访问它们。

`private` 成员属于对象的内部实现，外部代码不能直接访问，但该类自己的成员函数可以访问。

```cpp
class Vehicle
{
public:
    void setSpeed(double value);
    double getSpeed() const;

private:
    double speed_{};
};
```

调用者只能通过公开接口处理速度：

```cpp
Vehicle vehicle;
vehicle.setSpeed(0.2);

std::cout << vehicle.getSpeed() << '\n';
```

下面的直接访问不被允许：

```cpp
// vehicle.speed_ = 0.2; // 编译错误：speed_ 是 private
```

### 封装解决什么问题

封装的核心不是简单地“把变量改成 private”，而是把有关联的数据和操作组织在一起，通过有限、明确的接口维护对象状态。

轨迹管理中，下面三项数据存在关联：

- 路径点序列；
- 每个路径点对应的累计弧长；
- 整条路径的总长度。

如果外部代码可以直接修改路径，却忘记更新累计弧长和总长度，对象就会进入自相矛盾的状态。

更可靠的设计是把这些数据设为 `private`，只允许通过类似 `setPath()` 的公开函数统一更新：

```cpp
class PathTrack
{
public:
    void setPath(const RoughPath& path);
    double length() const;

private:
    RoughPath path_;
    std::vector<double> accumulated_s_;
    double length_{};
};
```

`private` 本身不会自动保证数据正确。真正维护约束的是成员函数中的实现逻辑。封装只是限制了修改入口，让约束更容易集中管理。

## 5. 类内声明与类外定义

成员函数可以直接在类的内部定义：

```cpp
class Vehicle
{
public:
    double getSpeed() const
    {
        return speed_;
    }

private:
    double speed_{};
};
```

也可以在类内只声明接口，再到类外实现：

```cpp
class Vehicle
{
public:
    void setSpeed(double value);
    double getSpeed() const;

private:
    double speed_{};
};
```

类外定义需要使用作用域解析运算符 `::`：

```cpp
void Vehicle::setSpeed(double value)
{
    speed_ = value;
}

double Vehicle::getSpeed() const
{
    return speed_;
}
```

`Vehicle::setSpeed()` 表示这个函数属于 `Vehicle` 类。即使函数体写在类外，它仍然是成员函数，因此能够访问 `private` 成员。

如果遗漏 `Vehicle::`：

```cpp
void setSpeed(double value)
{
    // speed_ = value; // 无法访问 Vehicle 的成员
}
```

这定义的是一个普通全局函数，而不是 `Vehicle` 的成员函数。

实际工程通常会把类声明放在头文件，把函数定义放在源文件。这样能够把“类型提供哪些接口”和“接口如何实现”分开阅读。

## 6. const 成员函数

在成员函数参数列表后添加 `const`，表示该函数不会通过当前对象修改普通非静态成员：

```cpp
class Vehicle
{
public:
    double getSpeed() const;

private:
    double speed_{};
};
```

查询型函数通常应声明为 `const`，例如：

```cpp
std::size_t getPointCount() const;
double getMaxSpeed() const;
bool empty() const;
void printTrajectory() const;
```

修改型函数通常不能声明为 `const`：

```cpp
void setTrajectory(const std::vector<TrajectoryPoint>& trajectory);
void limitSpeed(double max_speed);
void clear();
```

### 声明与定义必须一致

如果类内声明带有 `const`，类外定义也必须带有 `const`：

```cpp
double Vehicle::getSpeed() const
{
    return speed_;
}
```

遗漏函数末尾的 `const` 会使声明和定义不匹配。

### const 对象只能调用合适的成员函数

```cpp
const Vehicle vehicle;

vehicle.getSpeed();  // 可以：getSpeed() 是 const 成员函数
// vehicle.setSpeed(0.2); // 不可以：setSpeed() 会修改对象
```

正确使用 `const` 成员函数，能让只读对象和只读引用安全地调用查询接口。

## 7. 两种 const 不要混淆

下面两种 `const` 出现在不同位置，限制的对象也不同：

```cpp
void setTrajectory(
    const std::vector<TrajectoryPoint>& trajectory);

std::size_t getPointCount() const;
```

第一种 `const` 修饰引用参数：

- 函数不能通过参数修改调用者传入的 vector；
- 使用引用可以避免传参时复制整个容器。

第二种 `const` 修饰成员函数：

- 函数不能通过当前对象修改普通成员；
- `const` 对象可以调用这个函数。

两者可以同时出现：

```cpp
bool hasSameSize(
    const std::vector<TrajectoryPoint>& other) const;
```

这里既不修改参数 `other`，也不修改当前对象。

## 8. TrajectoryManager 的接口设计

本次实践使用 `TrajectoryManager` 管理内部轨迹：

```cpp
#include <cstddef>
#include <vector>

struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

class TrajectoryManager
{
public:
    void setTrajectory(
        const std::vector<TrajectoryPoint>& trajectory);

    void limitSpeed(double max_speed);

    std::size_t getPointCount() const;
    double getMaxSpeed() const;
    void printTrajectory() const;

private:
    std::vector<TrajectoryPoint> trajectory_;
};
```

这个接口把操作分成两类：

| 成员函数 | 类型 | 职责 |
| --- | --- | --- |
| `setTrajectory()` | 修改 | 替换内部轨迹 |
| `limitSpeed()` | 修改 | 原地限制内部轨迹速度 |
| `getPointCount()` | 查询 | 返回轨迹点数量 |
| `getMaxSpeed()` | 查询 | 返回轨迹中的最大速度 |
| `printTrajectory()` | 查询 | 输出轨迹信息 |

外部代码无法绕过接口直接修改 `trajectory_`，因此以后可以在 `setTrajectory()` 中加入校验、预处理或派生数据更新，而不需要修改所有调用者。

## 9. TrajectoryManager 的完整实现

### 设置轨迹

```cpp
void TrajectoryManager::setTrajectory(
    const std::vector<TrajectoryPoint>& trajectory)
{
    trajectory_ = trajectory;
}
```

参数使用 `const&` 避免传参时复制，赋值语句则明确把输入数据复制到对象自己的成员中。函数返回后，管理器仍然拥有一份独立轨迹。

### 原地限制速度

```cpp
void TrajectoryManager::limitSpeed(double max_speed)
{
    for (auto& point : trajectory_)
    {
        if (point.speed > max_speed)
        {
            point.speed = max_speed;
        }
    }
}
```

循环变量使用 `auto&`，因此修改会作用于 vector 中的原始元素。

### 获取轨迹点数量

```cpp
std::size_t TrajectoryManager::getPointCount() const
{
    return trajectory_.size();
}
```

`vector::size()` 返回容器的大小类型，因此函数也返回 `std::size_t`，避免不必要的有符号与无符号转换。

### 安全查询最大速度

```cpp
double TrajectoryManager::getMaxSpeed() const
{
    if (trajectory_.empty())
    {
        return 0.0;
    }

    double max_speed{trajectory_.front().speed};

    for (const auto& point : trajectory_)
    {
        if (point.speed > max_speed)
        {
            max_speed = point.speed;
        }
    }

    return max_speed;
}
```

调用 `front()` 前先检查容器是否为空，避免空 vector 越界。只读遍历使用 `const auto&`，不会复制每个轨迹点，也不能意外修改它们。

当前接口约定空轨迹的最大速度为 `0.0`。这是一项业务约定，而不是数学上的必然结论。更复杂的程序也可以使用 `std::optional<double>` 表示“没有最大值”。

### 输出轨迹

```cpp
#include <iostream>

void TrajectoryManager::printTrajectory() const
{
    for (std::size_t i{0}; i < trajectory_.size(); ++i)
    {
        const auto& point{trajectory_[i]};

        std::cout
            << i << ": ("
            << point.x << ", "
            << point.y << "), speed = "
            << point.speed << '\n';
    }
}
```

这个函数只读取对象，因此声明和定义都带有成员函数限定符 `const`。

## 10. 完整使用示例

```cpp
#include <cstddef>
#include <iostream>
#include <vector>

struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

class TrajectoryManager
{
public:
    void setTrajectory(
        const std::vector<TrajectoryPoint>& trajectory);

    void limitSpeed(double max_speed);

    std::size_t getPointCount() const;
    double getMaxSpeed() const;
    void printTrajectory() const;

private:
    std::vector<TrajectoryPoint> trajectory_;
};

void TrajectoryManager::setTrajectory(
    const std::vector<TrajectoryPoint>& trajectory)
{
    trajectory_ = trajectory;
}

void TrajectoryManager::limitSpeed(double max_speed)
{
    for (auto& point : trajectory_)
    {
        if (point.speed > max_speed)
        {
            point.speed = max_speed;
        }
    }
}

std::size_t TrajectoryManager::getPointCount() const
{
    return trajectory_.size();
}

double TrajectoryManager::getMaxSpeed() const
{
    if (trajectory_.empty())
    {
        return 0.0;
    }

    double max_speed{trajectory_.front().speed};

    for (const auto& point : trajectory_)
    {
        if (point.speed > max_speed)
        {
            max_speed = point.speed;
        }
    }

    return max_speed;
}

void TrajectoryManager::printTrajectory() const
{
    for (std::size_t i{0}; i < trajectory_.size(); ++i)
    {
        const auto& point{trajectory_[i]};

        std::cout
            << i << ": ("
            << point.x << ", "
            << point.y << "), speed = "
            << point.speed << '\n';
    }
}

int main()
{
    const std::vector<TrajectoryPoint> trajectory{
        {0.0, 0.0, 0.18},
        {0.1, 0.0, 0.22},
        {0.2, 0.1, 0.35},
        {0.3, 0.1, 0.40},
        {0.4, 0.2, 0.24}
    };

    TrajectoryManager manager;
    manager.setTrajectory(trajectory);

    std::cout << "Before limit:\n";
    manager.printTrajectory();

    manager.limitSpeed(0.26);

    std::cout << "After limit:\n";
    manager.printTrajectory();

    std::cout
        << "Point count: " << manager.getPointCount() << '\n'
        << "Maximum speed: " << manager.getMaxSpeed() << '\n';

    return 0;
}
```

执行限速后，原本为 `0.35` 和 `0.40` 的速度都会变为 `0.26`，其他不超过上限的速度保持不变。

## 11. 真实 ROS/C++ 项目中的类型设计

本次继续阅读了 `fork_planner` 中的几种类型，观察数据模型和功能模块如何划分。

### PathTrack：维护相互关联的路径状态

`PathTrack` 使用私有成员保存路径、累计弧长和总长度，通过 `set()` 统一更新这些相关数据，并通过 `length() const`、`empty() const` 等函数提供查询。

这体现了封装的重要目的：外部不应只改变路径，却留下过期的长度信息。

### TaskAllocator：隐藏任务调度状态

`TaskAllocator` 通过 `assignNextTask()`、`buildCache()` 等公开接口提供任务分配能力，内部缓存和计数由私有成员维护，避免调用者随意破坏调度状态。

### VehicleAgent：struct 也能拥有行为

`VehicleAgent` 保存车辆编号、速度、任务状态和路径进度等数据，同时提供 `active() const`、`remainingS() const` 等查询成员函数。这说明是否拥有成员函数并不是区分 `struct` 和 `class` 的标准。

### MultiVehicleConfig：以数据为主的配置类型

`MultiVehicleConfig` 主要保存车辆数量、最大速度、预测时域等配置，行为较少，更接近典型的数据结构体。

这些类型的差异来自职责，而不是简单地来自语法形式。

## 12. 本次实践中的常见错误

### 成员函数重复传入内部数据

最初可能会把成员函数写成：

```cpp
void limitSpeed(
    std::vector<TrajectoryPoint> trajectory,
    double max_speed);
```

但成员函数本来就能访问 `trajectory_`，不需要再次传入。按值传递还会修改副本并产生额外复制。

正确接口是：

```cpp
void limitSpeed(double max_speed);
```

### 类外定义遗漏作用域

```cpp
// void setTrajectory(...)            // 普通函数
void TrajectoryManager::setTrajectory(...) // 成员函数
```

只有带有 `TrajectoryManager::` 的定义才属于该类，并拥有访问私有成员的权限。

### 误以为派生数据会自动更新

如果 `length()` 只是返回保存的 `length_`，直接修改路径后它不会自动重新计算。必须通过统一接口同时更新原始数据和派生数据。

这正是需要封装路径修改入口的原因。

### 空 vector 访问第一个元素

```cpp
double max_speed{trajectory_[0].speed};
```

当容器为空时，这会产生未定义行为。使用 `front()` 也同样要求非空，因此必须先调用 `empty()` 检查。

### 只读遍历仍然复制元素

```cpp
for (auto point : trajectory_)
```

这会复制每个元素。只读遍历较大对象时，更合适的写法是：

```cpp
for (const auto& point : trajectory_)
```

需要修改原元素时则使用 `auto&`。

### 返回类型与 size() 不匹配

`vector::size()` 返回大小类型，查询函数应优先使用 `std::size_t`，而不是把结果缩窄为 `int`。

### private 不会禁止对象复制

```cpp
TrajectoryManager manager2{manager1};
```

如果没有主动禁止复制，这种写法可以复制整个对象，包括它的私有成员。访问控制限制的是普通外部代码直接访问成员，不是对象的正常复制行为。

由于 `std::vector` 具有值语义，两个管理器中的轨迹数据彼此独立：之后修改 `manager2` 不会自动改变 `manager1`。

## 13. 本篇总结

Day 8 的核心，是从“结构体保存数据、普通函数处理数据”逐步过渡到“类维护内部状态、成员函数提供操作接口”。

本次学习的关键结论包括：

- 普通函数通过参数接收对象，成员函数直接操作当前对象；
- `struct` 与 `class` 都能拥有数据、函数和访问控制，主要默认权限不同；
- `public` 表示对外接口，`private` 表示内部实现；
- 封装的目标是集中维护对象约束，而不只是隐藏成员；
- 类外定义成员函数时必须使用 `类名::函数名`；
- 查询型成员函数通常应声明为 `const`；
- 参数上的 `const` 和成员函数末尾的 `const` 限制不同对象；
- 成员函数不需要重复传入对象已经拥有的数据；
- 空 vector 不能访问 `front()` 或下标 0；
- `private` 不妨碍对象使用正常的值语义进行复制。

至此，已经能够独立编写简单的轨迹管理类，并初步理解真实 ROS/C++ 工程中“数据结构体”和“功能类”的职责划分。下一步将进入构造函数、初始化列表与对象生命周期，继续学习对象如何建立并保持合法状态。
