---
title: C++ 学习笔记 10：拷贝构造、拷贝赋值与对象复制语义
published: 2026-11-11
description: 系统梳理 C++ 拷贝构造函数、拷贝赋值运算符、默认逐成员复制、容器值语义、裸指针资源风险、对象传参与 C++17 复制消除。
tags: [C++ 学习, C++, 拷贝构造, 拷贝赋值, 复制语义]
category: C++ 学习
draft: false
---

前两篇分别学习了类的封装，以及对象如何通过构造函数建立初始状态。本篇继续研究另一个重要问题：已经存在一个对象时，怎样根据它创建新对象，或者把它的状态赋给另一个已有对象？

这就是 C++ 的复制语义。理解复制语义的关键，不只是记住拷贝构造函数的写法，还要判断复制之后的数据是彼此独立、共享底层资源，还是根本无法执行赋值。

## 1. 什么是拷贝构造函数

拷贝构造函数用于根据一个已有的同类型对象初始化新对象。典型形式是：

```cpp
ClassName(const ClassName& other);
```

以轨迹管理器为例：

```cpp
class TrajectoryManager
{
public:
    TrajectoryManager(
        const std::vector<TrajectoryPoint>& trajectory,
        double max_speed)
        : trajectory_{trajectory}, max_speed_{max_speed}
    {
    }

    TrajectoryManager(const TrajectoryManager& other)
        : trajectory_{other.trajectory_},
          max_speed_{other.max_speed_}
    {
        std::cout << "Copy constructor\n";
    }

private:
    std::vector<TrajectoryPoint> trajectory_;
    const double max_speed_;
};
```

使用已有对象创建新对象：

```cpp
TrajectoryManager manager1{path, 0.26};
TrajectoryManager manager2{manager1};
```

第二行调用拷贝构造函数，使用 `manager1` 的状态初始化新对象 `manager2`。

拷贝构造函数的参数通常采用 `const` 引用：

- 引用避免为了传参再次复制整个对象；
- `const` 表示构造过程中不通过参数修改原对象；
- 还允许复制 `const` 对象和部分临时对象。

不能简单地把参数写成同类型的值参数：

```cpp
// TrajectoryManager(TrajectoryManager other); // 错误设计
```

因为创建参数 `other` 本身就需要先复制实参，这又要求调用拷贝构造函数，从而无法建立有效的调用过程。

## 2. 三种写法都可能调用拷贝构造

下面三种写法都会创建新对象：

```cpp
TrajectoryManager manager2 = manager1;
TrajectoryManager manager3(manager1);
TrajectoryManager manager4{manager1};
```

它们分别属于：

| 写法 | 初始化形式 | 操作 |
| --- | --- | --- |
| `T b = a;` | 拷贝初始化 | 拷贝构造新对象 |
| `T b(a);` | 直接初始化 | 拷贝构造新对象 |
| `T b{a};` | 直接列表初始化 | 拷贝构造新对象 |

最容易误解的是：

```cpp
TrajectoryManager manager2 = manager1;
```

虽然出现了等号，但 `manager2` 正在这一行被定义，因此这是初始化新对象，不是对已有对象执行赋值。

## 3. 拷贝构造与拷贝赋值

拷贝构造负责创建新对象，拷贝赋值负责修改已经存在的对象：

```cpp
TrajectoryManager manager1{path1, 0.26};
TrajectoryManager manager2{path2, 0.30};

manager2 = manager1;
```

最后一行中的两个对象都已经存在，因此调用的是拷贝赋值运算符。

它的典型声明是：

```cpp
TrajectoryManager& operator=(
    const TrajectoryManager& other);
```

表达式：

```cpp
manager2 = manager1;
```

可以理解为：

```cpp
manager2.operator=(manager1);
```

两种操作的区别可以概括为：

| 操作 | 目标对象此前是否存在 | 使用的机制 |
| --- | --- | --- |
| 拷贝构造 | 否，正在创建 | 初始化每个成员 |
| 拷贝赋值 | 是 | 修改目标对象已有成员 |

这个区别对 `const` 成员和引用成员尤其重要。

## 4. const 成员对复制操作的影响

考虑下面的成员：

```cpp
const double max_speed_;
```

拷贝构造仍然可以工作，因为新对象中的 `max_speed_` 尚未建立，可以在初始化列表中获得值：

```cpp
TrajectoryManager::TrajectoryManager(
    const TrajectoryManager& other)
    : trajectory_{other.trajectory_},
      max_speed_{other.max_speed_}
{
}
```

但默认拷贝赋值需要修改一个已经存在的对象。`max_speed_` 完成初始化后不能再次赋值，因此编译器无法生成能够逐成员赋值的默认拷贝赋值运算符。

结果通常是：

```cpp
TrajectoryManager manager2{manager1}; // 可以：拷贝构造

// manager2 = manager1;               // 编译错误：拷贝赋值被删除
```

包含 `const` 成员的类仍然可以自定义拷贝赋值，但函数不能修改该 `const` 成员。这样就必须明确决定：

- 只复制可赋值成员是否符合对象语义；
- 两个速度上限不同的对象赋值后，应保留目标上限还是拒绝操作；
- 是否干脆显式删除拷贝赋值。

如果无法给出清晰答案，显式禁止赋值更容易理解：

```cpp
TrajectoryManager& operator=(
    const TrajectoryManager&) = delete;
```

如果业务确实需要完整的普通赋值语义，可以把速度上限改为非 `const` 成员，再通过私有成员和受控接口维护其合法性。

## 5. private 是类级别的访问控制

`private` 限制类外代码直接访问成员，但同一个类的成员函数可以访问任意同类对象的私有成员。

```cpp
class Vehicle
{
public:
    void copySpeedFrom(const Vehicle& other)
    {
        speed_ = other.speed_;
    }

private:
    double speed_{};
};
```

这里：

- `speed_` 表示当前对象的私有成员；
- `other.speed_` 表示另一个 `Vehicle` 对象的私有成员；
- `copySpeedFrom()` 属于 `Vehicle` 类，因此访问合法。

自定义拷贝构造函数和拷贝赋值运算符正是依靠这种权限读取另一个同类对象的内部状态。

成员函数是否为 `public` 不影响它访问同类私有成员的能力。`public` 和 `private` 决定的是类外代码能否调用或直接访问，而不是类内函数可以访问哪个同类对象。

## 6. 编译器生成的默认拷贝构造

如果没有手动声明拷贝构造函数，并且各成员允许复制，编译器通常可以隐式生成逐成员拷贝逻辑。

```cpp
class TrajectoryManager
{
public:
    TrajectoryManager(
        const std::vector<TrajectoryPoint>& trajectory,
        double max_speed)
        : trajectory_{trajectory}, max_speed_{max_speed}
    {
    }

private:
    std::vector<TrajectoryPoint> trajectory_;
    const double max_speed_;
};
```

即使没有手写拷贝构造函数，下面的复制通常也能完成：

```cpp
TrajectoryManager manager2{manager1};
```

编译器生成的版本会分别调用：

- `trajectory_` 的拷贝构造函数；
- `max_speed_` 对应数值的初始化。

也可以显式要求默认行为：

```cpp
TrajectoryManager(
    const TrajectoryManager&) = default;
```

## 7. 自定义拷贝后要自己负责成员初始化

如果手动定义了拷贝构造函数，编译器不会在函数体之外再额外执行一套默认逐成员复制。

```cpp
TrajectoryManager::TrajectoryManager(
    const TrajectoryManager& other)
    : trajectory_{other.trajectory_},
      max_speed_{other.max_speed_}
{
    std::cout << "Copy constructor\n";
}
```

初始化列表中的两项分别负责：

- 调用 vector 的拷贝构造，建立独立轨迹容器；
- 为新对象的 `const` 速度上限提供初始值。

如果省略初始化列表：

```cpp
TrajectoryManager::TrajectoryManager(
    const TrajectoryManager& other)
{
}
```

那么 `trajectory_` 会尝试默认构造为空容器，而没有默认成员初始化器的 `const double max_speed_` 无法得到值，最终导致编译失败。

实际工程中，如果所有成员已经拥有正确的复制语义，通常不需要手写逐成员拷贝。显式实现更适合确实需要特殊复制规则、资源所有权处理或教学调试的类型。

这种“让成员类型自己正确管理资源、让编译器组合默认操作”的设计常被概括为 Rule of Zero。

## 8. 复制后的数据是否独立

对象复制后的关系由成员类型决定。

### 数值成员

`int`、`double` 等普通数值被复制后，每个对象拥有独立的值：

```cpp
double first{0.2};
double second{first};

second = 0.3;
// first 仍然是 0.2
```

### vector 和 string

`std::vector` 和 `std::string` 具有值语义。复制容器后，两个容器分别管理自己的元素存储：

```cpp
std::vector<double> first{0.18, 0.30, 0.35};
std::vector<double> second{first};

second[1] = 0.26;
```

执行后：

```text
first[1]  == 0.30
second[1] == 0.26
```

因此，包含 `std::vector<TrajectoryPoint>` 的 `TrajectoryManager` 被正常复制后，两份轨迹元素彼此独立。

### 裸指针

裸指针的默认复制只复制地址值：

```cpp
struct PathView
{
    double* speeds{};
};

double data[3]{0.18, 0.30, 0.35};

PathView first{data};
PathView second{first};

second.speeds[1] = 0.26;
```

此时两个指针指向同一个数组，因此通过 `second` 修改数据后，`first` 也能观察到变化。

所谓“浅拷贝”和“深拷贝”描述的是复制后底层数据的关系，并不是两套独立的 C++ 语法。审查代码时，应具体分析每个成员的值语义与资源所有权。

## 9. 裸指针与所有权风险

看到裸指针成员时，必须先判断它表达的是哪种关系：

- 只观察外部对象，不负责释放；
- 独占动态资源，并负责释放；
- 与其他对象共享资源；
- 可能为空或悬空的普通地址。

如果两个对象通过默认复制得到相同地址，并且都认为自己拥有通过 `new[]` 申请的内存，那么两个析构函数都可能执行 `delete[]`，造成重复释放和未定义行为。

如果一方释放资源，另一方继续访问相同地址，则会使用悬空指针，同样属于未定义行为。

因此，“对象已经复制”不等于“指针指向的资源已经复制”。即使 vector 本身拥有独立存储，如果它的元素内部含有裸指针，仍需继续追踪指针所指向数据的所有权。

现代 C++ 应优先使用能够表达所有权的 RAII 类型，或者使用标准容器直接保存数据，而不是让多个对象模糊地管理同一裸指针资源。

## 10. 聚合初始化不要求用户定义构造函数

符合聚合类型要求的结构体，可以在没有用户定义构造函数的情况下使用花括号初始化：

```cpp
struct TrajectoryPoint
{
    double x{};
    double y{};
    double speed{};
};

TrajectoryPoint point{1.0, 2.0, 0.26};
```

这里按照成员声明顺序执行聚合初始化，并不是调用手写的三参数构造函数。

类似地：

```cpp
struct PathView
{
    double* speeds{};
};

PathView view{data};
```

也可以通过聚合初始化让 `speeds` 指向 `data`。

`struct` 和 `class` 都能拥有构造函数，也都可以使用 `{}` 初始化。看到花括号时，不能仅凭外观判断底层机制，需要结合类型定义判断它是聚合初始化、列表初始化中的构造函数调用，还是其他初始化形式。

## 11. 对象传参与复制开销

处理轨迹管理器时，常见参数形式如下：

```cpp
void process(TrajectoryManager manager);
void inspect(const TrajectoryManager& manager);
void update(TrajectoryManager& manager);
```

它们表达不同的数据关系：

| 传参方式 | 是否创建对象副本 | 能否修改调用者原对象 | 典型用途 |
| --- | --- | --- | --- |
| `T` | 传入左值时通常需要复制 | 不会通过形参直接修改 | 建立独立工作副本 |
| `const T&` | 否 | 不能通过该引用修改 | 碰撞检测、只读查询 |
| `T&` | 否 | 可以 | 原地限速、状态更新 |

按值传入一个已有左值对象时，通常会调用拷贝构造函数创建形参对象。函数返回时，形参对象会被析构。

使用 `const T&` 时不会创建新的 `TrajectoryManager`。引用形参离开作用域也不会析构调用者的原对象，因为引用不是独立对象，也不拥有被引用对象。

接口选择可以遵循：

- 只读取大型对象：优先考虑 `const T&`；
- 需要修改调用者对象：使用 `T&`；
- 函数确实需要独立副本：使用值传递，或在函数内明确复制。

## 12. C++17 复制消除

考虑按值返回对象：

```cpp
TrajectoryManager createManager(
    const std::vector<TrajectoryPoint>& path)
{
    return TrajectoryManager{path, 0.26};
}
```

在 C++17 中，这种返回同类型纯右值的场景会直接在最终结果位置构造对象，不需要先构造一个独立临时对象，再调用拷贝构造把它复制到返回结果。

如果返回具名局部变量：

```cpp
TrajectoryManager createManager(
    const std::vector<TrajectoryPoint>& path)
{
    TrajectoryManager manager{path, 0.26};
    return manager;
}
```

编译器通常可以执行具名返回值优化，也就是 NRVO，但 C++17 并不在所有这种场景下强制保证它一定发生。

### 复制消除不代表所有数据复制都消失

构造函数中仍然有：

```cpp
trajectory_{path}
```

这会把外部 vector 的轨迹元素复制到管理器内部。复制消除避免的是特定场景下额外复制整个返回对象，并不会自动取消构造函数内部必要的数据复制。

分析性能时，应区分：

- 整个返回对象是否发生额外复制；
- 对象构造过程中，各成员是否需要复制数据。

## 13. 引用成员的复制语义

真实工程中的管理类可能保存外部对象的引用：

```cpp
class TaskAllocator
{
public:
    TaskAllocator(
        const MapParam& map_param,
        PathGenerator& generator)
        : map_param_{map_param}, generator_{generator}
    {
    }

private:
    const MapParam& map_param_;
    PathGenerator& generator_;
};
```

复制构造 `TaskAllocator` 时，引用成员仍然绑定原来的外部对象，不会自动复制被引用的地图参数或路径生成器。

这意味着两个分配器副本可能引用同一个外部状态。

引用一旦绑定就不能重新绑定到另一个对象，因此包含引用成员的类通常无法使用编译器生成的默认拷贝赋值运算符。与 `const` 成员一样，设计者需要明确决定赋值语义，或者显式禁止赋值。

此外，被引用对象必须在所有引用使用期间保持存活，否则复制出的对象同样可能持有悬空引用。

## 14. fork_planner 中的复制语义

本次继续结合 `fork_planner` 的相关类型理解对象复制。

### VehicleAgent

`VehicleAgent` 保存车辆编号、速度、任务状态、`PathTrack`、近期目标和资源区间等数据。

复制对象时：

- 普通数值成员按值复制；
- vector 成员复制元素；
- `PathTrack` 根据自身成员的复制规则进行复制。

因此，判断整个对象是否独立，需要逐层分析成员类型。

### PathTrack

`PathTrack` 的主要成员包括路径、累计弧长和总长度：

```cpp
RoughPath path_;
std::vector<double> accumulated_s_;
double length_{0.0};
```

其中 `RoughPath` 是轨迹点 vector 的类型别名。路径点是普通数值数据时，默认复制会让两个 `PathTrack` 对象分别拥有自己的容器元素。

项目中类似下面的语句：

```cpp
vehicle.track = vehicle.pending_dropoff_track;
```

左右两侧对象都已经存在，因此这里调用的是拷贝赋值，而不是拷贝构造。赋值完成后，两个 `PathTrack` 的 vector 存储仍然彼此独立。

### TaskAllocator

`TaskAllocator` 使用多个引用成员保存地图参数、规划参数、系统配置、地图和路径生成器。

这种设计避免在分配器内部复制大型对象，但也意味着：

- 拷贝构造后，各副本仍引用相同外部对象；
- 引用成员无法重新绑定，默认拷贝赋值通常不可用；
- 外部对象必须比所有分配器引用活得更久。

`const MultiVehicleConfig&` 只限制通过这个引用修改配置，并不会让原始配置对象永久变成常量。

### 状态快照

任务分配器中的快照类型保存访问计数器和随机数生成器状态。`snapshot()` 按值返回快照，`restore(const Snapshot&)` 通过常量引用读取快照并恢复内部状态。

这种设计适合预测或搜索过程：

1. 保存当前调度状态；
2. 在独立状态上尝试候选方案；
3. 必要时恢复之前的状态；
4. 避免试探过程直接污染真实调度数据。

## 15. TrajectoryManager 复制实验

下面的示例显式定义拷贝构造函数，以观察复制过程：

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
    TrajectoryManager(
        const std::vector<TrajectoryPoint>& trajectory,
        double max_speed)
        : trajectory_{trajectory}, max_speed_{max_speed}
    {
        std::cout << "Construct\n";
    }

    TrajectoryManager(const TrajectoryManager& other)
        : trajectory_{other.trajectory_},
          max_speed_{other.max_speed_}
    {
        std::cout << "Copy construct\n";
    }

    TrajectoryManager& operator=(
        const TrajectoryManager&) = delete;

    ~TrajectoryManager()
    {
        std::cout << "Destruct\n";
    }

    void limitSpeed()
    {
        for (auto& point : trajectory_)
        {
            if (point.speed > max_speed_)
            {
                point.speed = max_speed_;
            }
        }
    }

    std::size_t getPointCount() const
    {
        return trajectory_.size();
    }

    double getTrajectoryMaxSpeed() const
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

    double getSpeedLimit() const
    {
        return max_speed_;
    }

    void printTrajectory() const
    {
        for (std::size_t i{0}; i < trajectory_.size(); ++i)
        {
            std::cout
                << i << ": "
                << trajectory_[i].speed << '\n';
        }
    }

private:
    std::vector<TrajectoryPoint> trajectory_;
    const double max_speed_;
};

int main()
{
    const std::vector<TrajectoryPoint> path{
        {0.0, 0.0, 0.15},
        {0.1, 0.0, 0.20},
        {0.2, 0.1, 0.35},
        {0.3, 0.1, 0.40},
        {0.4, 0.2, 0.18}
    };

    TrajectoryManager manager1{path, 0.26};
    TrajectoryManager manager2{manager1};

    manager2.limitSpeed();

    std::cout << "manager1:\n";
    manager1.printTrajectory();

    std::cout << "manager2:\n";
    manager2.printTrajectory();
}
```

限速之后，两份数据的关系为：

| 轨迹点 | `manager1` | `manager2` |
| --- | ---: | ---: |
| 0 | 0.15 | 0.15 |
| 1 | 0.20 | 0.20 |
| 2 | 0.35 | 0.26 |
| 3 | 0.40 | 0.26 |
| 4 | 0.18 | 0.18 |

这说明 `manager2` 中的 vector 是从 `manager1` 复制得到的独立容器。修改副本中的轨迹点不会改变原对象。

两个对象都位于 `main()` 作用域中，`manager2` 后构造，因此正常退出时先析构 `manager2`，再析构 `manager1`。

示例中的构造和析构输出用于观察调用过程。实际项目中，如果类型只包含 vector 和数值成员，通常更适合使用编译器生成的默认拷贝与析构行为。

## 16. 本次学习中的典型误区

### 误以为 private 禁止同类对象互访

`private` 阻止的是类外直接访问。同一个类的成员函数可以访问其他同类对象的私有成员。

### 认为 struct 没有构造函数就不能使用花括号

聚合类型可以直接使用聚合初始化，不要求存在用户定义构造函数。

### 认为拷贝构造必须手写

成员本身具有正确复制语义时，编译器通常可以生成合适的逐成员拷贝构造函数。

### 自定义拷贝后仍期待自动复制其他成员

一旦自己定义拷贝构造函数，就需要在初始化列表中正确处理需要复制的成员，编译器不会额外补上一套默认复制逻辑。

### 混淆拷贝构造与拷贝赋值

定义新对象时发生拷贝构造；等号左侧对象已经存在时发生拷贝赋值。

### 认为 const 成员完全禁止复制

`const` 成员可以在新对象构造阶段初始化，所以拷贝构造通常可用；但它不能在已有对象中重新赋值，因此默认拷贝赋值通常被删除。

### 认为 const 引用让原对象永久不可修改

`const T&` 只禁止通过该引用修改对象。原对象是否还能通过其他非 const 路径修改，取决于它自身的声明和其他别名。

### 认为复制消除会取消所有数据复制

C++17 的复制消除针对特定的对象构造过程，不会自动取消成员初始化中必要的 vector 元素复制。

## 17. 本篇总结

Day 10 的核心，是理解对象被复制时究竟发生了什么，以及复制后的数据关系由谁决定。

关键结论包括：

- 拷贝构造函数使用已有对象初始化新对象；
- 拷贝赋值运算符把状态写入已经存在的对象；
- `T b = a` 出现在对象定义中时是拷贝初始化，不是赋值；
- 编译器通常能生成逐成员拷贝操作；
- 自定义拷贝构造后，需要自己正确初始化各成员；
- 同一个类的成员函数可以访问任意同类对象的私有成员；
- vector 和 string 具有值语义，正常复制后拥有独立元素存储；
- 裸指针默认只复制地址，必须继续分析资源所有权和生命周期；
- `const` 成员允许拷贝构造，但通常使默认拷贝赋值不可用；
- 引用成员复制后仍绑定原对象，也通常使默认拷贝赋值不可用；
- `const T&` 适合高效只读访问，`T&` 适合原地修改，值传递适合独立副本；
- C++17 复制消除不会取消构造函数内部必要的数据复制；
- 只包含标准容器和数值成员的类型，通常应优先采用编译器默认复制行为。

在 ROS/C++ 工程中，对象复制不应被当成一个无成本、无差别的语法动作。是否需要副本、复制后是否共享外部状态、资源由谁拥有，以及赋值操作是否合理，都应该通过成员类型和函数接口明确表达。
