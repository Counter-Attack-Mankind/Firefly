---
title: C++ 学习笔记 09：构造函数、初始化列表与对象生命周期
published: 2026-11-09
description: 系统学习 C++ 构造函数重载、成员初始化列表、默认构造、默认成员初始化器、对象生命周期、析构函数和 RAII，并完善 TrajectoryManager 的初始化设计。
tags: [C++ 学习, C++, 构造函数, 对象生命周期, RAII]
category: C++ 学习
draft: false
---

上一篇通过 `class`、成员函数和访问控制实现了简单的轨迹管理器，但对象仍然需要先创建，再调用 `setTrajectory()` 设置状态。本篇进一步学习如何让对象在创建阶段就建立合法状态，以及对象离开作用域时如何自动完成清理。

这涉及 C++ 对象模型中非常重要的三个主题：构造函数、成员初始化列表和对象生命周期。

## 1. 构造函数负责建立对象初始状态

构造函数是一种特殊的成员函数，在对象创建时自动执行，用于建立对象的初始状态。

```cpp
class Vehicle
{
public:
    Vehicle(int vehicle_id, double initial_speed)
        : id_{vehicle_id}, speed_{initial_speed}
    {
    }

private:
    int id_{};
    double speed_{};
};
```

创建对象时，编译器会根据实参选择匹配的构造函数：

```cpp
Vehicle car{1, 0.2};
```

这里 `id_` 被初始化为 `1`，`speed_` 被初始化为 `0.2`。

构造函数具有几个明显特征：

- 名称必须与类名完全相同；
- 不能声明返回类型，连 `void` 也不能写；
- 创建对象时自动调用；
- 主要职责是建立对象的初始状态；
- 可以通过不同参数列表进行重载。

构造函数与普通成员函数的区别如下：

| 对比项 | 构造函数 | 普通成员函数 |
| --- | --- | --- |
| 名称 | 必须与类名相同 | 可以自定义 |
| 返回类型 | 不能声明 | 通常需要声明 |
| 调用时机 | 创建对象时自动调用 | 对象创建后按需调用 |
| 主要作用 | 建立初始状态 | 查询或修改已有对象 |
| 能否重载 | 可以 | 可以 |

构造函数不是通过已有对象再次直接调用的普通操作。对象创建完成后若要修改状态，应使用赋值或普通成员函数。

## 2. 构造函数可以重载

一个类可以提供多个参数列表不同的构造函数：

```cpp
class Vehicle
{
public:
    Vehicle() = default;

    explicit Vehicle(int vehicle_id)
        : id_{vehicle_id}
    {
    }

    Vehicle(int vehicle_id, double initial_speed)
        : id_{vehicle_id}, speed_{initial_speed}
    {
    }

private:
    int id_{};
    double speed_{};
};
```

调用时，编译器根据实参寻找匹配版本：

```cpp
Vehicle first{};
Vehicle second{2};
Vehicle third{3, 0.25};
```

只有一个参数的构造函数可能参与隐式类型转换。暂时不希望发生这种转换时，可以使用 `explicit`，让调用意图更加明确。

## 3. 成员初始化列表

成员初始化列表出现在构造函数参数列表之后、函数体之前：

```cpp
class Vehicle
{
public:
    Vehicle(int vehicle_id, double initial_speed)
        : id_{vehicle_id}, speed_{initial_speed}
    {
    }

private:
    int id_{};
    double speed_{};
};
```

基本形式是：

```text
类名(参数) : 成员1{初始值}, 成员2{初始值}
{
    构造函数体
}
```

成员会在进入构造函数体之前完成初始化。

### 初始化与赋值不同

下面的写法使用初始化列表直接构造成员：

```cpp
Vehicle(double speed)
    : speed_{speed}
{
}
```

下面的写法则先进入成员自身的初始化过程，再在构造函数体内执行赋值：

```cpp
Vehicle(double speed)
{
    speed_ = speed;
}
```

对于 `std::vector`、`std::string` 等类类型成员，在构造函数体内赋值通常意味着先默认构造成员，再替换其内容；初始化列表可以直接使用目标数据构造成员。

因此，工程中通常优先使用成员初始化列表，尤其是以下成员：

- `const` 成员；
- 引用成员；
- 没有默认构造函数的类类型成员；
- 需要使用特定参数进行构造的成员。

## 4. 成员按声明顺序初始化

成员的实际初始化顺序由它们在类中的声明顺序决定，而不是初始化列表中的书写顺序。

```cpp
class Vehicle
{
private:
    double max_speed_;
    double current_speed_;

public:
    explicit Vehicle(double speed)
        : max_speed_{speed}, current_speed_{max_speed_}
    {
    }
};
```

这里 `max_speed_` 先声明，因此它会先初始化；随后 `current_speed_` 才读取它的值。

如果交换成员声明顺序：

```cpp
class Vehicle
{
private:
    double current_speed_;
    double max_speed_;

public:
    explicit Vehicle(double speed)
        : max_speed_{speed}, current_speed_{max_speed_}
    {
    }
};
```

即使初始化列表仍把 `max_speed_` 写在前面，实际也会先初始化 `current_speed_`。此时读取尚未初始化的 `max_speed_` 会导致未定义行为。

编译器可能通过 `-Wreorder` 等警告提示顺序问题，但代码不应依赖警告拦截。更好的习惯是让初始化列表顺序与成员声明顺序保持一致。

## 5. const 成员和引用成员必须初始化

### const 成员

`const` 成员在对象创建后不能重新赋值，因此必须在初始化阶段得到值：

```cpp
class TrajectoryManager
{
public:
    explicit TrajectoryManager(double max_speed)
        : max_speed_{max_speed}
    {
    }

private:
    const double max_speed_;
};
```

不能在构造函数体内写：

```cpp
// max_speed_ = max_speed; // 错误：const 成员不能赋值
```

### 引用成员

引用必须在创建时绑定某个已有对象，也必须使用初始化列表：

```cpp
class Planner
{
public:
    explicit Planner(PathGenerator& generator)
        : generator_{generator}
    {
    }

private:
    PathGenerator& generator_;
};
```

引用成员不是外部对象的副本，而是它的别名。外部对象发生变化时，通过引用成员也能观察到变化；通过非 const 引用修改数据时，外部对象也会受到影响。

引用不会延长被引用对象的生命周期。使用引用成员的类必须确保外部对象比自己活得更久。

## 6. 默认成员初始化器与初始化列表

成员可以在声明处提供默认值：

```cpp
class Vehicle
{
private:
    int id_{0};
    double max_speed_{0.26};
};
```

如果某个构造函数没有在初始化列表中指定该成员，就会使用默认成员初始化器。

如果初始化列表明确提供了值，则使用初始化列表中的值：

```cpp
class Vehicle
{
public:
    explicit Vehicle(double max_speed)
        : max_speed_{max_speed}
    {
    }

private:
    double max_speed_{0.26};
};
```

创建 `Vehicle{0.3}` 时，`max_speed_` 直接初始化为 `0.3`，不会先使用 `0.26` 再覆盖。

默认成员初始化器适合表达类型自身合理的默认状态；构造函数初始化列表则负责表达本次对象创建所需的具体状态。

## 7. 什么是默认构造函数

默认构造函数是可以在不提供实参的情况下调用的构造函数。它不一定必须拥有空参数列表：

```cpp
Vehicle();
Vehicle(int id = 0);
```

上面两种构造函数都可以用于：

```cpp
Vehicle car{};
```

如果类没有声明任何构造函数，并且所有成员都能够正常初始化，编译器通常可以隐式声明默认构造函数。

一旦程序员声明了其他构造函数，编译器就不会再自动提供隐式默认构造函数：

```cpp
class Vehicle
{
public:
    explicit Vehicle(int id);
};

// Vehicle car{}; // 编译错误：没有可用的默认构造函数
```

需要默认构造时，可以显式请求编译器生成：

```cpp
Vehicle() = default;
```

`= default` 表示采用编译器生成的默认实现。它与手写空函数体 `Vehicle() {}` 在某些初始化细节和类型性质上并不完全等价，不应简单视为相同写法。

## 8. 声明构造函数不等于创建对象

下面这些写法位于类定义中时，只是在声明构造函数：

```cpp
Vehicle();
Vehicle() = default;
Vehicle(int id);
```

它们不会创建对象。

构造函数不能带返回类型：

```cpp
// void Vehicle(); // 错误：这不是合法构造函数
```

真正创建对象的写法包括：

```cpp
Vehicle car;
Vehicle car{};
Vehicle car2{3};
Vehicle car3(3);
```

其中最容易误解的是：

```cpp
Vehicle car();
```

这不是创建默认对象，而是声明一个名为 `car`、无参数、返回 `Vehicle` 的函数。这种现象通常被称为 Most Vexing Parse。

无参数创建对象时，优先使用：

```cpp
Vehicle car{};
```

花括号和圆括号在部分场景下具有不同的重载与窄化转换规则，因此不能认为它们永远完全等价。

## 9. 默认初始化与值初始化

考虑下面这个类：

```cpp
class Vehicle
{
public:
    Vehicle() = default;

    int id;
    double max_speed;
};
```

对于这个具体定义：

```cpp
Vehicle car1;
Vehicle car2{};
```

- `car1` 进行默认初始化，基本类型成员没有得到确定值；
- `car2` 进行值初始化，由于默认构造函数是在首次声明时显式默认化而不是用户提供的空函数体，对象会先进行零初始化，因此 `id == 0`、`max_speed == 0.0`。

如果把构造函数改为用户提供的空函数体：

```cpp
Vehicle() {}
```

那么即使写 `Vehicle car2{};`，函数体没有初始化的基本类型成员也不会因此自动获得可靠的零值。

最容易理解、也最稳定的做法，是直接给成员明确的默认成员初始化器：

```cpp
class Vehicle
{
public:
    Vehicle() = default;

private:
    int id_{0};
    double max_speed_{0.26};
};
```

不要仅凭“类存在默认构造函数”就推断所有基本类型成员一定为零。

## 10. 默认构造还要考虑访问权限

判断 `Vehicle car{};` 是否合法，不能只看有没有带参构造函数，还需要判断默认构造函数是否存在、是否可用，以及是否允许当前代码访问。

| 类中的构造情况 | 外部执行 `Vehicle car{};` |
| --- | --- |
| 未声明构造函数，隐式默认构造可用 | 合法 |
| `public: Vehicle() = default;` | 合法 |
| `public: Vehicle() {}` | 合法 |
| 只有 `public: Vehicle(int id);` | 编译错误 |
| `public: Vehicle(int id = 0);` | 合法 |
| `private: Vehicle() = default;` | 编译错误 |

“默认构造函数不存在”与“默认构造函数存在但不可访问”是不同原因导致的编译错误。

编译器隐式声明的默认构造函数具有与类默认访问规则相对应的可访问性；程序员显式声明的构造函数则遵循它所在的 `public`、`private` 或 `protected` 区域。

## 11. 对象生命周期

对象生命周期从对象初始化完成后开始，到对象被销毁时结束。

作用域描述名称在源代码中的可见范围。对于普通局部对象，它的生命周期通常与所在块作用域紧密相关：

```cpp
int main()
{
    Vehicle first{};

    {
        Vehicle second{};
    } // second 在这里销毁

} // first 在这里销毁
```

内层对象 `second` 会在内层右花括号处先结束生命周期，而 `first` 会一直存在到 `main()` 的外层作用域结束。

对于同一作用域内正常完成构造的局部对象，通常遵循后构造、先析构：

```cpp
Vehicle first{};
Vehicle second{};
Vehicle third{};
```

正常离开作用域时，顺序是：

```text
third -> second -> first
```

这与栈结构的后进先出顺序相似。

## 12. 析构函数

析构函数在对象生命周期结束时执行清理工作：

```cpp
class Vehicle
{
public:
    ~Vehicle()
    {
        std::cout << "Destruct\n";
    }
};
```

析构函数具有以下规则：

- 名称是 `~类名`；
- 没有返回类型；
- 不能接收参数；
- 不能重载；
- 对象销毁时自动调用。

可以用简单的日志观察顺序：

```cpp
class LifecycleProbe
{
public:
    explicit LifecycleProbe(int id)
        : id_{id}
    {
        std::cout << "Construct " << id_ << '\n';
    }

    ~LifecycleProbe()
    {
        std::cout << "Destruct " << id_ << '\n';
    }

private:
    int id_{};
};

int main()
{
    LifecycleProbe first{1};

    {
        LifecycleProbe second{2};
    }

    std::cout << "Finish\n";
}
```

输出顺序为：

```text
Construct 1
Construct 2
Destruct 2
Finish
Destruct 1
```

析构日志适合学习和调试，但普通业务类型不应为了“证明析构发生”而长期打印日志。

## 13. RAII：让对象管理资源

RAII 是 Resource Acquisition Is Initialization 的缩写，常译为“资源获取即初始化”。核心思想是让资源的生命周期绑定到对象：

- 构造对象时获取或建立资源；
- 对象存活期间保持资源有效；
- 对象析构时自动释放资源。

`std::vector` 会管理自身申请的动态内存。`TrajectoryManager` 使用 vector 保存轨迹时，通常不需要手动释放内存，也不需要为了释放容量而在析构函数中调用 `clear()`：

```cpp
class TrajectoryManager
{
public:
    ~TrajectoryManager() = default;

private:
    std::vector<TrajectoryPoint> trajectory_;
};
```

管理器销毁时，`trajectory_` 会自动析构并释放它拥有的存储。

需要注意：vector 只管理自身拥有的元素和存储。如果元素是裸指针，vector 析构只会销毁这些指针值，不会自动 `delete` 指针指向的外部对象。需要所有权时，应使用合适的 RAII 类型表达。

## 14. `::`、`.` 与 `->`

类的声明、类外定义和成员调用使用不同运算符：

| 场景 | 示例 |
| --- | --- |
| 类内声明成员函数 | `void printTrajectory() const;` |
| 类外定义成员函数 | `void TrajectoryManager::printTrajectory() const {}` |
| 通过对象调用 | `manager.printTrajectory();` |
| 通过对象指针调用 | `ptr->printTrajectory();` |
| 类内声明构造函数 | `TrajectoryManager();` |
| 类外定义构造函数 | `TrajectoryManager::TrajectoryManager() {}` |

`::` 是作用域解析运算符，用于说明名称属于哪个类或命名空间；`.` 用于通过具体对象访问成员；`->` 用于通过对象指针访问成员。

普通非静态成员函数依赖某个具体对象，不能直接用类名调用：

```cpp
TrajectoryManager manager{};
manager.printTrajectory(); // 正确

// TrajectoryManager::printTrajectory(); // 错误
```

类外定义时使用 `类名::函数名`，并不等于调用该函数。

## 15. 真实 ROS/C++ 项目中的初始化设计

本次继续阅读了 `fork_planner` 中几种不同类型的初始化方式。

| 类型 | 初始化方式 | 设计含义 |
| --- | --- | --- |
| `TaskAllocator` | 显式带参构造函数和初始化列表 | 创建时必须获得地图、规划参数及路径生成器 |
| `PathTrack` | 隐式默认构造与默认成员初始化 | 可以先建立空路径，再设置规划结果 |
| `VehicleAgent` | 大量默认成员初始化器 | 车辆从确定的停止、待分配状态开始 |
| `MultiVehicleConfig` | 默认成员初始化器 | 提供车辆数量、速度和预测时域等默认配置 |

`TaskAllocator` 的构造函数初始化列表包含类似逻辑：

```cpp
TaskAllocator::TaskAllocator(
    const MapParam& map_param,
    const PlannerParam& planner_param,
    const MultiVehicleConfig& config,
    const ForkliftMap& map,
    PathGenerator& generator)
    : map_param_{map_param},
      planner_param_{planner_param},
      config_{config},
      map_{map},
      generator_{generator}
{
}
```

对应成员是引用：

```cpp
const MapParam& map_param_;
const PlannerParam& planner_param_;
const MultiVehicleConfig& config_;
const ForkliftMap& map_;
PathGenerator& generator_;
```

它们必须在对象构造时绑定外部已有对象。如果从初始化列表中删除 `generator_{generator}`，引用成员将无法完成初始化，结果是编译错误，而不是等到运行时使用它才出错。

相比之下，`PathTrack` 可以依靠成员默认构造和默认成员初始化器建立空状态：

```cpp
RoughPath path_;
std::vector<double> accumulated_s_;
double length_{0.0};
```

是否需要显式构造函数，取决于对象能否仅凭成员的默认行为建立合法、清晰的状态。

## 16. 改进 TrajectoryManager

在上一版轨迹管理器中加入默认构造、带参构造和固定速度上限：

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
    TrajectoryManager();

    TrajectoryManager(
        const std::vector<TrajectoryPoint>& trajectory,
        double max_speed);

    void setTrajectory(
        const std::vector<TrajectoryPoint>& trajectory);

    void limitSpeed();

    std::size_t getPointCount() const;
    double getMaxSpeed() const;
    double getSpeedLimit() const;
    void printTrajectory() const;

private:
    std::vector<TrajectoryPoint> trajectory_;
    const double max_speed_;
};
```

默认构造函数建立空轨迹和默认速度上限：

```cpp
TrajectoryManager::TrajectoryManager()
    : trajectory_{}, max_speed_{0.26}
{
}
```

带参构造函数直接复制传入轨迹，并初始化速度上限：

```cpp
TrajectoryManager::TrajectoryManager(
    const std::vector<TrajectoryPoint>& trajectory,
    double max_speed)
    : trajectory_{trajectory}, max_speed_{max_speed}
{
}
```

限速函数不再重复接收上限，而是使用对象自身的配置：

```cpp
void TrajectoryManager::limitSpeed()
{
    for (auto& point : trajectory_)
    {
        if (point.speed > max_speed_)
        {
            point.speed = max_speed_;
        }
    }
}
```

安全查询最大轨迹速度：

```cpp
double TrajectoryManager::getMaxSpeed() const
{
    if (trajectory_.empty())
    {
        return 0.0;
    }

    double result{trajectory_.front().speed};

    for (const auto& point : trajectory_)
    {
        if (point.speed > result)
        {
            result = point.speed;
        }
    }

    return result;
}
```

### const 速度上限的设计取舍

`const double max_speed_` 表示管理器创建后，速度上限不再改变。这适合固定配置，但会带来一个重要影响：类的默认拷贝赋值运算符会因为 `const` 成员不可重新赋值而被删除。

通常仍然可以复制构造：

```cpp
TrajectoryManager second{first};
```

但不能直接进行默认拷贝赋值：

```cpp
// second = first; // 通常编译错误：max_speed_ 是 const 成员
```

如果业务需要动态调整速度上限，或者需要正常的对象赋值语义，可以把成员改为普通 `double`，再通过受控成员函数维护它的合法范围。

## 17. 本次学习中的重点错误

### 混淆构造函数声明和对象创建

```cpp
Vehicle();       // 构造函数声明
Vehicle car{};   // 创建对象
Vehicle car();   // 函数声明
```

三者语法接近，但含义完全不同。

### 混淆初始化和赋值

初始化列表在成员生命周期开始时建立状态；构造函数体内的赋值发生在成员已经完成初始化之后。

### 只考虑构造函数是否存在

默认构造失败还可能是因为函数不可访问、已被删除，或某个成员本身无法默认构造。诊断时不能只看是否声明了带参构造函数。

### 引用成员未绑定

引用成员必须在初始化列表中绑定。遗漏初始化会直接导致编译失败，不是潜在的运行时错误。

### 写反析构顺序

同一作用域内正常构造的局部对象通常后构造、先析构；内层作用域对象则会在内层作用域结束时提前销毁。

### 为 vector 手动释放内存

vector 自己遵循 RAII。拥有 vector 成员的普通类通常不需要在析构函数中手动 `clear()` 或释放其内部存储。

## 18. 本篇总结

Day 9 的核心，是从“对象创建后再设置状态”过渡到“对象在构造阶段就建立合法状态，并在生命周期结束时自动清理资源”。

本次学习的关键结论包括：

- 构造函数与类同名，不声明返回类型，并在创建对象时自动调用；
- 构造函数可以重载，编译器根据实参选择匹配版本；
- 成员初始化列表在构造函数体执行前初始化成员；
- 成员实际按照声明顺序初始化，与初始化列表书写顺序无关；
- `const` 成员和引用成员必须在初始化阶段获得值或完成绑定；
- 默认构造函数是可以无实参调用的构造函数，不一定参数列表为空；
- `= default` 与用户提供的空构造函数不应简单视为完全等价；
- `Vehicle car();` 是函数声明，`Vehicle car{};` 才会创建对象；
- 默认构造函数存在，不代表所有基本类型成员一定自动归零；
- 普通局部对象正常离开作用域时自动析构，通常遵循后构造、先析构；
- RAII 让 vector 等资源管理对象在析构时自动完成清理；
- 引用成员要求外部对象具有足够长的生命周期；
- `const` 数据成员能够固定配置，但也会影响对象的默认赋值能力。

下一步可以继续学习拷贝构造函数、拷贝赋值运算符和移动语义，进一步理解对象复制时内部数据、引用成员和 `const` 成员分别会发生什么。
