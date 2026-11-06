---
title: C++ 学习笔记 07：深入 struct——数据组织与函数接口设计
published: 2026-11-06
description: 深入学习 C++ struct 的聚合初始化、嵌套组合与复制语义，并结合车辆轨迹模型梳理值传递、引用传递、常量引用和返回值设计。
tags: [C++ 学习, C++, struct, 数据建模, 函数接口]
category: C++ 学习
draft: false
---

经过前几篇对变量、引用、指针、`std::string` 和 `std::vector` 的学习，现在可以进一步思考一个更接近工程实践的问题：如何把彼此相关的数据组织成清晰的模型，并通过函数接口准确表达“读取、修改或生成新数据”的意图。

本篇以车辆状态和轨迹规划为例，深入梳理 `struct` 的数据组织能力、对象复制、嵌套结构以及函数参数设计，同时作为第一周 C++ 学习的阶段总结。

## 1. struct 是自定义数据类型

`struct` 可以把多个具有逻辑关联的变量组合成一个新的类型：

```cpp
struct VehicleState
{
    double x{};
    double y{};
    double yaw{};
    double speed{};
};
```

这里定义的是类型，而不是某一个具体对象。之后可以使用这个类型创建任意数量的车辆状态：

```cpp
VehicleState car{1.0, 2.0, 0.0, 0.2};
VehicleState forklift{};
```

与 C 语言的传统写法相比，C++ 创建对象时可以直接使用结构体名称，不需要再次写 `struct` 关键字，也不需要额外使用 `typedef`。

结构体成员通过点运算符访问：

```cpp
std::cout << car.speed << '\n';
car.speed = 0.3;
```

在 C++ 中，`struct` 不只能保存数据，还能定义成员函数、构造函数和访问权限。现阶段先把重点放在它的数据组织能力上。

## 2. 初始化与赋值不是同一件事

创建对象时为它提供初始状态，称为初始化：

```cpp
VehicleState car{0.0, 0.0, 0.0, 0.2};
```

对象已经存在之后，再用新数据替换其状态，称为赋值：

```cpp
VehicleState car2{};
car2 = {1.0, 2.0, 0.0, 0.3};
```

这两种写法外观相似，但发生的时机不同。

### 为什么推荐使用花括号

对于简单结构体，花括号能够清楚地表达聚合初始化，并阻止部分危险的窄化转换：

```cpp
VehicleState car{};
```

空花括号会对成员进行值初始化。上例中四个 `double` 成员都会得到 `0.0`。

相比之下，如果结构体成员没有默认成员初始化器，下面的普通局部对象可能包含未初始化值：

```cpp
struct RawState
{
    double x;
    double y;
};

RawState state;  // x 和 y 的值不确定，不能直接读取
```

为成员添加 `{}` 默认值，能够让默认创建的对象具有可预测状态：

```cpp
struct SafeState
{
    double x{};
    double y{};
};
```

## 3. 嵌套成员的初始化与重新赋值

结构体可以包含另一个结构体对象：

```cpp
struct Vehicle
{
    int id{};
    VehicleState state{};
};
```

创建 `Vehicle` 时，可以一次初始化所有成员：

```cpp
Vehicle car{
    1,
    {0.0, 0.0, 0.0, 0.2}
};
```

如果 `car` 已经存在，`car.state` 也是一个已经存在的成员对象。因此更新它时应使用赋值：

```cpp
car.state = {1.0, 2.0, 0.1, 0.3};
```

也可以显式构造一个临时对象后再赋值：

```cpp
car.state = VehicleState{1.0, 2.0, 0.1, 0.3};
```

下面的写法不正确：

```cpp
// car.state{1.0, 2.0, 0.1, 0.3};
```

花括号初始化出现在对象定义中，而已经存在的成员对象不能通过在名称后直接追加花括号来“重新初始化”。

## 4. 对象复制、引用与独立性

结构体对象可以直接复制：

```cpp
VehicleState car_a{1.0, 2.0, 0.0, 0.2};
VehicleState car_b{car_a};

car_b.speed = 0.5;
```

`car_b` 是一个独立对象，修改它不会改变 `car_a`。

需要区分下面三种写法：

| 写法 | 含义 | 修改 `b` 是否影响 `a` |
| --- | --- | --- |
| `Vehicle b{a};` | 复制出一个新对象 | 否 |
| `Vehicle& b{a};` | `b` 是 `a` 的可修改别名 | 是 |
| `const Vehicle& b{a};` | `b` 是 `a` 的只读别名 | 不能通过 `b` 修改 |

`const` 引用不会把原对象永久变成常量。如果原对象本身不是 `const`，仍然可以通过原变量修改它：

```cpp
VehicleState state{};
const VehicleState& view{state};

state.speed = 0.2;       // 可以
// view.speed = 0.3;     // 编译错误
```

引用也不是两个对象之间的数据同步机制。它只是同一个对象的另一个名称。

### 含 vector 的结构体如何复制

如果结构体包含 `std::vector`，默认复制会复制容器中的元素：

```cpp
struct Path
{
    std::vector<double> speeds;
};

Path original{{0.1, 0.2}};
Path copy{original};

copy.speeds[0] = 0.8;
// original.speeds[0] 仍然是 0.1
```

两个结构体对象各自拥有独立的 vector。

但如果结构体包含普通指针，默认复制只会复制指针保存的地址，不会自动复制它所指向的对象：

```cpp
struct PointerState
{
    double* speed{};
};
```

复制 `PointerState` 后，两个指针可能指向同一块数据。涉及资源所有权时，不能只凭“结构体被复制了”就认为内部数据也完全独立。

## 5. 使用嵌套结构描述车辆与轨迹

实际工程中的车辆对象通常包含编号、当前状态和预测轨迹。可以先定义最小的数据单元，再逐层组合：

```cpp
#include <vector>

struct VehicleState
{
    double x{};
    double y{};
    double yaw{};
    double speed{};
};

struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

struct Vehicle
{
    int id{};
    VehicleState state{};
    std::vector<TrajectoryPoint> trajectory;
};
```

创建一个完整的车辆对象：

```cpp
Vehicle car{
    1,
    {0.0, 0.0, 0.0, 0.2},
    {
        {0.0, 0.0, 0.18},
        {0.1, 0.0, 0.20},
        {0.2, 0.0, 0.28}
    }
};
```

访问嵌套成员时，可以连续使用 `.` 和 `[]`：

```cpp
car.state.speed;          // 车辆当前速度
car.trajectory[0].speed;  // 第一个预测轨迹点的参考速度
```

虽然这两个成员都叫 `speed`，但它们表达的不是同一份数据。修改轨迹点速度不会自动更新车辆当前速度，除非程序显式执行同步或状态更新。

### 聚合初始化应使用花括号

轨迹点应写成：

```cpp
std::vector<TrajectoryPoint> trajectory{
    {0.0, 0.0, 0.18},
    {0.1, 0.0, 0.20}
};
```

不要用 `(0.0, 0.0, 0.18)` 代替结构体的聚合初始化。圆括号在这里不会表达 C++17 的聚合初始化；其中的逗号还可能被解释为逗号运算符。对聚合类型使用花括号，语义最明确。

## 6. 数据模型应按职责拆分

设计结构体时，不应把“看起来有关”的所有变量都塞进同一个对象，而应该先判断它们分别描述什么概念。

| 数据模型 | 主要职责 |
| --- | --- |
| `VehicleState` | 当前坐标、航向角和速度等运动状态 |
| `TrajectoryPoint` | 单个轨迹点的位置与参考速度 |
| `PlannerConfig` | 最大速度、预测时域等规划配置 |
| `Vehicle` | 车辆编号、当前状态和轨迹等聚合信息 |

例如，规划配置可以单独定义：

```cpp
struct PlannerConfig
{
    double max_speed{};
    double prediction_horizon{};
};
```

车辆当前速度和最大允许速度都使用 `double`，但它们属于不同概念：一个描述实时状态，另一个描述约束。把它们放在合适的数据模型中，可以减少误用。

结构体并不是越多越好，也不是成员越少越好。更重要的是：

- 每个类型有清晰的职责；
- 成员之间具有稳定、明确的逻辑关系；
- 不相关的数据不会被过度耦合；
- 调用者能够从类型和成员名称理解数据含义。

如果一条轨迹只需要保存轨迹点，`std::vector<TrajectoryPoint>` 已经足够。如果还需要保存生成时间、版本、来源或有效性，再考虑引入独立的 `Trajectory` 结构体。

## 7. 用函数接口表达数据操作意图

函数参数的传递方式应由函数职责决定。可以先把操作分为三类：读取现有数据、修改现有数据、根据输入生成新数据。

### 值传递：函数获得副本

```cpp
void printSpeed(double speed);
```

对于 `int`、`double` 等小型对象，值传递简单且成本低。函数修改形参不会影响调用者的变量。

如果大型结构体按值传入，整个对象及其内部 vector 通常都需要复制，可能带来不必要的开销。

### 非 const 引用：修改调用者对象

```cpp
void updateVehicle(Vehicle& car);
```

`Vehicle&` 表示函数直接操作原对象，适合车辆状态更新、轨迹原地限速等操作。调用者看到接口后，也能意识到传入对象可能被修改。

### const 引用：只读访问大型对象

```cpp
void printVehicle(const Vehicle& car);
```

`const Vehicle&` 不复制整个车辆对象，同时禁止函数通过参数修改它，适合打印、查询和计算等只读操作。

### 按值返回：生成新对象

```cpp
std::vector<TrajectoryPoint> generateLimitedTrajectory(
    const std::vector<TrajectoryPoint>& trajectory,
    const PlannerConfig& config);
```

这个接口表达的是：只读原轨迹和配置，生成并返回一条新的轨迹。

函数可以安全地按值返回局部结构体或 vector。编译器能够通过返回值优化或移动语义避免许多不必要的复制。

## 8. 返回值与对象生命周期

下面的函数根据当前状态生成一个新状态：

```cpp
VehicleState predictState(const VehicleState& current)
{
    VehicleState predicted{current};
    predicted.speed = 0.3;
    return predicted;
}
```

调用时直接按值接收：

```cpp
VehicleState future{predictState(car.state)};
```

不要把返回类型随意改成引用：

```cpp
VehicleState& predictState(const VehicleState& current)  // 错误设计
{
    VehicleState predicted{current};
    return predicted;
}
```

`predicted` 是局部对象，函数结束时就被销毁。返回它的引用会产生悬空引用。

同样，按值返回的临时结果不能绑定到普通非 const 左值引用：

```cpp
// VehicleState& future{predictState(car.state)}; // 编译错误
```

在需要拥有结果时，直接使用值对象接收最清晰。

## 9. struct 也可以拥有成员函数

C++ 的结构体可以把与数据紧密相关的简单行为放在类型内部：

```cpp
struct VehicleState
{
    double x{};
    double y{};
    double yaw{};
    double speed{};

    void limitSpeed(double max_speed)
    {
        if (speed > max_speed)
        {
            speed = max_speed;
        }
    }
};
```

成员函数可以直接访问当前对象的成员：

```cpp
VehicleState state{0.0, 0.0, 0.0, 0.4};
state.limitSpeed(0.3);
```

只读取对象的成员函数还可以声明为 `const`：

```cpp
struct VehicleState
{
    double speed{};

    bool isStopped() const
    {
        return speed == 0.0;
    }
};
```

这里函数末尾的 `const` 表示它不会修改当前对象的普通成员。这是从数据结构逐步走向面向对象设计的重要基础。

## 10. fork_planner 项目阅读记录

本次还结合 `fork_planner` 中的部分代码，观察了结构体、类和函数接口在真实项目中的使用方式：

- `VehicleAgent`：管理车辆编号、当前速度、任务状态、路径和近期目标等信息；
- `MultiVehicleConfig`：管理最大速度、预测时域、预测步长及多车协调参数；
- `PathTrack`：保存路径和累计弧长，并提供路径查询与更新操作；
- `TaskAllocator`：通过不同形式的引用参数表达任务分配过程中哪些对象可修改、哪些集合只读。

其中，`PathTrack::set()` 的设计很有代表性：

```cpp
void PathTrack::set(const RoughPath& path)
{
    path_ = path;
    s_.clear();
    s_.reserve(path_.size());
    length_ = 0.0;

    // 后续遍历路径，并通过 push_back() 生成累计弧长
}
```

这个函数中包含几种不同的数据操作：

- `const RoughPath& path`：只读访问调用者传入的路径，避免参数复制；
- `path_ = path`：把输入路径复制到当前对象的成员中；
- `s_.clear()`：清除旧的累计弧长数据；
- `s_.reserve(path_.size())`：预留容量，但不创建有效元素；
- 后续 `push_back()`：逐个创建新的累计弧长元素。

参数是 `const` 引用，并不表示整个成员函数都不能修改数据。它只限制通过 `path` 参数修改外部路径；函数仍然可以修改当前对象的非 const 成员。

任务分配接口也展示了类似的权限表达：

```cpp
bool assignNextTask(
    VehicleAgent& vehicle,
    const std::vector<VehicleAgent>& all);
```

- `vehicle` 是可修改引用，表示函数可能更新目标车辆；
- `all` 是只读集合，表示函数只查询其他车辆；
- `bool` 返回本次任务分配是否成功。

一个设计良好的函数接口，本身就能向调用者解释大部分数据流向和修改权限。

## 11. 第一周代码审查中的重点错误

### 错误一：混淆 auto 与 auto&

即使函数参数已经是 `vector&`，范围 for 中的 `auto point` 仍然会复制每个元素：

```cpp
void limitTrajectory(
    std::vector<TrajectoryPoint>& trajectory,
    double max_speed)
{
    for (auto point : trajectory)
    {
        point.speed = max_speed;  // 只修改副本
    }
}
```

原地修改元素必须使用引用：

```cpp
for (auto& point : trajectory)
{
    if (point.speed > max_speed)
    {
        point.speed = max_speed;
    }
}
```

如果循环只读取元素，通常使用 `const auto&`：

```cpp
for (const auto& point : trajectory)
{
    std::cout << point.speed << '\n';
}
```

函数形参的引用与循环变量的引用是两层独立的设计，不能相互替代。

### 错误二：把 reserve 当成创建元素

```cpp
std::vector<TrajectoryPoint> trajectory;
trajectory.reserve(5);

// trajectory[0] = {0.0, 0.0, 0.18}; // 未定义行为
```

`reserve(5)` 只改变容量，不改变 `size()`。此时 vector 仍为空，下标 0 不是有效元素。

实际只有三个轨迹点时，应使用：

```cpp
trajectory.reserve(5);
trajectory.push_back({0.0, 0.0, 0.18});
trajectory.push_back({0.1, 0.0, 0.20});
trajectory.push_back({0.2, 0.0, 0.22});
```

直接 `resize(5)` 会创建五个有效元素，与“当前只有三个轨迹点”的数据含义不一致。

### erase 与引用失效

删除 vector 中的元素后，删除位置及其之后的引用、指针和迭代器都会失效。即使后续元素向前移动，也不能继续依赖旧引用，应在容器修改完成后重新获取目标元素。

### clear 不会保留元素生命周期

`clear()` 会销毁所有元素，此前指向这些元素的引用都会失效。`const` 只限制修改，不能延长普通容器元素的生命周期。

如果清空后仍需要某个元素，应提前按值复制：

```cpp
if (!trajectory.empty())
{
    TrajectoryPoint first{trajectory.front()};
    trajectory.clear();

    std::cout << first.speed << '\n';
}
```

### 正确区分错误类型

程序问题不能全部笼统地称为“运行时错误”：

| 类型 | 示例 |
| --- | --- |
| 编译错误 | 把临时对象绑定到非 const 左值引用 |
| 逻辑错误 | 用 `auto` 修改副本，却以为原元素已改变 |
| 异常 | `vector::at()` 越界时抛出 `std::out_of_range` |
| 未定义行为 | 使用 `operator[]` 越界，或访问悬空引用 |

准确判断问题类型，有助于选择正确的调试方式。

## 12. 综合示例：车辆状态与轨迹管理

下面的程序把本篇的重要知识组合在一起：

```cpp
#include <iostream>
#include <vector>

struct VehicleState
{
    double x{};
    double y{};
    double yaw{};
    double speed{};
};

struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

struct PlannerConfig
{
    double max_speed{};
    double prediction_horizon{};
};

struct Vehicle
{
    int id{};
    VehicleState state{};
    std::vector<TrajectoryPoint> trajectory;
};

void limitTrajectory(
    std::vector<TrajectoryPoint>& trajectory,
    const PlannerConfig& config)
{
    for (auto& point : trajectory)
    {
        if (point.speed > config.max_speed)
        {
            point.speed = config.max_speed;
        }
    }
}

std::vector<TrajectoryPoint> createLimitedTrajectory(
    const std::vector<TrajectoryPoint>& trajectory,
    const PlannerConfig& config)
{
    std::vector<TrajectoryPoint> result{trajectory};
    limitTrajectory(result, config);
    return result;
}

void printVehicle(const Vehicle& vehicle)
{
    std::cout
        << "Vehicle " << vehicle.id
        << ", current speed = " << vehicle.state.speed
        << '\n';

    for (std::size_t i{0}; i < vehicle.trajectory.size(); ++i)
    {
        const auto& point{vehicle.trajectory[i]};

        std::cout
            << "  point " << i
            << ": (" << point.x << ", " << point.y << ')'
            << ", speed = " << point.speed
            << '\n';
    }
}

int main()
{
    const PlannerConfig config{0.25, 3.0};

    Vehicle vehicle{
        1,
        {0.0, 0.0, 0.0, 0.2},
        {
            {0.0, 0.0, 0.18},
            {0.1, 0.0, 0.28},
            {0.2, 0.0, 0.32}
        }
    };

    Vehicle limited{vehicle};
    limited.trajectory = createLimitedTrajectory(
        vehicle.trajectory,
        config
    );

    std::cout << "Original:\n";
    printVehicle(vehicle);

    std::cout << "Limited:\n";
    printVehicle(limited);

    return 0;
}
```

这个示例体现了以下设计：

- 使用不同结构体区分车辆状态、轨迹点和规划配置；
- 通过嵌套与 vector 组合出完整车辆模型；
- 使用非 const 引用原地修改轨迹；
- 使用 `const&` 只读配置和车辆数据；
- 按值返回新轨迹，避免返回局部对象引用；
- 复制车辆后修改副本，保留原始数据；
- 使用 `const auto&` 读取 vector 中的结构体元素。

## 13. Week 1 阶段总结

第一周新增和巩固的核心能力包括：

- 使用 `struct` 定义具有明确含义的自定义数据类型；
- 使用花括号安全初始化聚合对象；
- 通过结构体嵌套和 `std::vector<struct>` 组织车辆与轨迹数据；
- 理解结构体复制、引用别名和普通指针成员的差异；
- 根据函数职责选择值传递、非 const 引用或 const 引用；
- 安全地按值返回局部结构体和 vector；
- 结合对象生命周期判断悬空引用风险；
- 使用函数接口表达数据的读取权限、修改权限和结果状态。

当前仍需要反复巩固两组知识：

1. `auto`、`auto&` 与 `const auto&` 的区别；
2. `reserve()`、`resize()`、`size()` 与 `capacity()` 的关系。

它们之所以容易重复出错，是因为都涉及“表面写法相似，但对象语义不同”。解决这类问题不能只记住语法，而要持续追问：这里创建的是副本还是别名？容器拥有的是容量还是有效元素？函数是在读取、修改，还是生成新对象？

至此，C++ 基础语法与数据组织的第一阶段已经形成完整链条。下一阶段可以逐步转向程序组织、类与对象设计，以及真实 ROS/C++ 项目中的接口阅读和数据流分析。
