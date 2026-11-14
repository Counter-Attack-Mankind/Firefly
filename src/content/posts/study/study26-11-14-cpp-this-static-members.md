---
title: C++ 学习笔记 11：this 指针与 static 静态成员
published: 2026-11-14
description: 系统学习 C++ this 指针、const 成员函数、名称遮蔽、return *this、静态数据成员、静态成员函数、静态工厂及对象存活计数。
tags: [C++ 学习, C++, this 指针, static, 静态成员]
category: C++ 学习
draft: false
---

前几篇逐步学习了类的封装、对象构造和复制语义。本篇继续回答两个与“数据归属”有关的问题：普通成员函数如何知道自己正在操作哪个对象？多个同类对象又该如何共享同一份类级数据或工具函数？

前一个问题对应 `this` 指针，后一个问题对应 `static` 静态成员。

## 1. this 指向当前对象

`this` 是 C++ 关键字，是非静态成员函数中隐含的、指向当前对象的指针。它不需要手动声明，也不需要额外包含头文件。

```cpp
void TrajectoryManager::limitSpeed()
{
    for (auto& point : this->trajectory_)
    {
        if (point.speed > this->max_speed_)
        {
            point.speed = this->max_speed_;
        }
    }
}
```

不同对象调用同一份成员函数代码时，`this` 指向不同对象：

```cpp
manager1.limitSpeed(); // this 指向 manager1
manager2.limitSpeed(); // this 指向 manager2
```

这就是成员函数能够分别访问每个对象内部数据的基础。

不存在名称冲突时，下面两种写法效果相同：

```cpp
trajectory_.clear();
this->trajectory_.clear();
```

第一种写法隐式通过当前对象访问成员，通常更加简洁。

## 2. this 与 *this

`this` 是指针，`*this` 是对该指针解引用后得到的当前对象。

| 表达式 | 含义 |
| --- | --- |
| `this` | 指向当前对象的指针 |
| `*this` | 当前对象本身 |
| `this->speed_` | 访问当前对象的成员 |
| `(*this).speed_` | 与 `this->speed_` 等价 |
| `Vehicle* ptr{this};` | 创建指向当前对象的指针 |
| `Vehicle& ref{*this};` | 创建当前对象的引用 |
| `Vehicle copy{*this};` | 拷贝构造一个新对象 |

例如：

```cpp
Vehicle& Vehicle::getSelf()
{
    return *this;
}
```

这里返回的是当前对象的引用，并没有创建新对象。

`this` 本身不能被重新赋值，也不存在于静态成员函数中，因为静态成员函数不依赖某个具体对象。

## 3. const 成员函数如何改变 this

成员函数参数列表末尾的 `const` 修饰成员函数，限制它通过当前对象修改普通非 `mutable` 成员：

```cpp
double Vehicle::getSpeed() const
{
    return speed_;
}
```

在普通非 `const` 成员函数中，可以把 `this` 理解为指向可修改当前对象的指针；在 `const` 成员函数中，它指向只读的当前对象。

| 成员函数声明 | 概念上的 `this` 类型 | 参数 `other` |
| --- | --- | --- |
| `void f(Vehicle& other)` | `Vehicle*` | `Vehicle&` |
| `void f(const Vehicle& other)` | `Vehicle*` | `const Vehicle&` |
| `void f(Vehicle& other) const` | `const Vehicle*` | `Vehicle&` |
| `void f(const Vehicle& other) const` | `const Vehicle*` | `const Vehicle&` |

为了理解其含义，可以把下面的成员函数：

```cpp
void f(Vehicle& other) const;
```

近似想象成带有隐含对象参数的函数：

```cpp
// 仅用于理解，不是真实的成员函数声明
void f(const Vehicle* self, Vehicle& other);
```

## 4. 函数末尾的 const 不修饰形参

考虑下面的成员函数：

```cpp
void Vehicle::synchronize(Vehicle& other) const
{
    other.speed_ = this->speed_;
    // this->speed_ = 0.10; // 编译错误
}
```

调用：

```cpp
car1.synchronize(car2);
```

此时：

- `this` 指向 `car1`；
- `other` 引用 `car2`；
- 函数末尾的 `const` 限制通过 `this` 修改 `car1`；
- `other` 是普通非 const 引用，因此仍然可以修改 `car2`。

函数末尾的 `const` 与形参是否可修改没有直接关系。

```cpp
void Vehicle::test(double value) const
{
    value = 0.3;       // 可以：修改局部参数
    // speed_ = value; // 不可以：修改当前对象
    value = speed_;    // 可以：读取当前对象
}
```

它也不会把形参变成所谓的 `Vehicle& const`。引用在绑定后本来就不能重新绑定，不能通过这种写法给引用本身增加顶层 `const`。

## 5. const 成员函数仍能修改什么

`const` 成员函数限制的是通过当前对象修改普通对象状态，但它仍然可以修改：

- 普通局部变量；
- 按值传入的形参副本；
- 通过非 const 引用或指针传入的其他对象；
- 非 const 静态数据成员；
- 被声明为 `mutable` 的成员。

例如，静态成员不属于某个具体对象：

```cpp
class Vehicle
{
public:
    void recordQuery() const
    {
        ++query_count_;
    }

private:
    inline static int query_count_{0};
};
```

即使 `recordQuery()` 是 `const` 成员函数，也可以修改类级共享的 `query_count_`。

`mutable` 适合缓存、互斥量或调试计数等逻辑上不改变对象可观察值的内部状态，但不应仅为了绕过 `const` 约束而滥用。

## 6. 名称遮蔽与 this->

当函数形参或局部变量与成员变量同名时，较近作用域中的名称会遮蔽成员名称。

```cpp
class Vehicle
{
public:
    void setSpeed(double speed)
    {
        speed = speed; // 形参给自身赋值
    }

private:
    double speed{};
};
```

这段代码可以通过编译，却没有修改成员变量，是典型逻辑错误。

使用 `this->` 可以明确区分成员和形参：

```cpp
void Vehicle::setSpeed(double speed)
{
    this->speed = speed;
}
```

构造函数初始化列表也能使用同名参数：

```cpp
Vehicle::Vehicle(int id, double speed)
    : id{id}, speed{speed}
{
}
```

花括号外侧是成员名称，花括号内侧会解析为构造函数形参。

## 7. 使用成员后缀减少歧义

工程中常用下划线后缀区分成员变量：

```cpp
class Vehicle
{
public:
    explicit Vehicle(double speed)
        : speed_{speed}
    {
    }

    void setSpeed(double speed)
    {
        speed_ = speed;
    }

private:
    double speed_{};
};
```

`speed_` 是成员，`speed` 是形参，数据归属一目了然。这只是一种命名规范，不是 C++ 强制语法。

| 写法 | 实际含义 |
| --- | --- |
| `speed = speed;` | 存在同名形参时，形参给自身赋值 |
| `this->speed = speed;` | 把形参赋给成员 |
| `speed_ = speed;` | 通过命名区别成员与形参 |
| `speed = new_speed;` | 没有遮蔽时，直接修改成员 |

成员变量属于对象并会保留修改结果。调用另一个没有修改该成员的函数，不会让它自动恢复构造时的初始值。状态会一直保留，直到程序再次修改成员或对象生命周期结束。

## 8. return *this 返回引用还是副本

`return *this;` 的具体含义由函数返回类型决定。

### 返回当前对象的引用

```cpp
Vehicle& Vehicle::setSpeed(double speed)
{
    speed_ = speed;
    return *this;
}
```

这里不创建副本，返回值仍然引用原对象，因此可以链式调用：

```cpp
car.setSpeed(0.3).setSpeed(0.4);
```

两次调用都作用于 `car`，最终速度是 `0.4`。

### 按值返回当前对象

```cpp
Vehicle Vehicle::setSpeedCopy(double speed)
{
    speed_ = speed;
    return *this;
}
```

`*this` 是左值，按值返回时需要根据当前对象构造返回结果。C++17 对纯右值的保证复制消除不直接适用于 `return *this;`。

```cpp
car.setSpeedCopy(0.3).setSpeedCopy(0.4);
```

第一次调用把原对象速度改为 `0.3`，然后返回副本；第二次调用作用于这个临时副本，因此原对象最终仍是 `0.3`。

| 返回类型 | 返回内容 | 是否复制 | 后续修改影响原对象 |
| --- | --- | --- | --- |
| `Vehicle&` | 当前对象引用 | 否 | 是 |
| `Vehicle` | 当前对象副本 | 是 | 否 |

## 9. 链式调用应服务于接口语义

链式调用常见于流式输入输出、配置器、Builder 模式和数学对象：

```cpp
std::cout << "speed: " << speed << '\n';
```

拷贝赋值运算符通常也返回当前对象引用：

```cpp
Vehicle& Vehicle::operator=(const Vehicle& other)
{
    if (this != &other)
    {
        id_ = other.id_;
        speed_ = other.speed_;
    }

    return *this;
}
```

于是能够支持：

```cpp
car1 = car2 = car3;
```

不过，在轨迹规划、车辆控制和冲突检测等具有独立业务职责的函数中，不必为了形式紧凑刻意设计链式接口。分开调用往往更容易调试和表达执行顺序。

## 10. static 数据成员属于整个类

普通数据成员属于具体对象，每个对象各自保存一份数据：

```cpp
class Vehicle
{
private:
    double speed_{};
};
```

静态数据成员属于整个类，所有同类对象共享同一份：

```cpp
class Vehicle
{
private:
    static int vehicle_count_;
};
```

### 传统写法：类内声明，类外定义

```cpp
class Vehicle
{
private:
    static int vehicle_count_;
};

int Vehicle::vehicle_count_{0};
```

类外定义时不再重复写 `static`。

### C++17：inline static

```cpp
class Vehicle
{
private:
    inline static int vehicle_count_{0};
};
```

`inline static` 允许直接在类定义中完成静态数据成员的定义和初始化，并能安全放在被多个编译单元包含的头文件中。

这里的 `inline` 主要处理定义规则，不代表一定会把代码内联或提高运行速度。

## 11. static 成员的常见声明形式

| 类内写法 | 是否可用 | 含义 |
| --- | --- | --- |
| `int count_{0};` | 是 | 每个对象独有的普通成员 |
| `static int count_;` | 是 | 静态成员声明，需要定义 |
| `static int count_{0};` | 一般不可以 | 普通可修改静态成员不能这样类内初始化 |
| `inline static int count_{0};` | C++17 起可以 | 类内定义并初始化共享成员 |
| `static const int count_{0};` | 特殊规则下可以 | 静态整型常量 |
| `static constexpr double dt{0.1};` | 可以 | 类级编译期常量 |

对于传统的类内静态整型常量，如果发生需要对象实体的 ODR-use，在某些标准版本和使用方式下仍可能需要类外定义。

C++17 中，`static constexpr` 数据成员隐含 `inline`，通常不再需要额外的类外定义；更早标准中的部分使用场景可能仍然需要。

## 12. static、const 与 constexpr 的职责

三个关键字解决的问题不同：

| 关键字 | 核心作用 |
| --- | --- |
| `static` 类数据成员 | 决定数据属于整个类，而不是某个对象 |
| `const` | 限制通过相应名称、引用或指针修改数据 |
| `constexpr` | 表达编译期常量或编译期求值能力 |

例如：

```cpp
class Vehicle
{
private:
    inline static int vehicle_count_{0}; // 类级共享，可修改
    const double max_speed_{0.26};       // 每个对象独有，不可修改
    static constexpr double dt_{0.1};    // 类级共享，编译期常量
};
```

`static const` 表示类级共享的只读数据；`static constexpr` 进一步要求它适合编译期常量表达式。

## 13. 使用 static 统计存活对象

静态数据成员可以用来记录当前存活的对象数量，但计数器不会自动维护，所有真正创建和销毁对象的路径都必须正确处理。

```cpp
class Vehicle
{
public:
    Vehicle(int id, double speed)
        : id_{id}, speed_{speed}
    {
        ++vehicle_count_;
    }

    Vehicle(const Vehicle& other)
        : id_{other.id_}, speed_{other.speed_}
    {
        ++vehicle_count_;
    }

    ~Vehicle()
    {
        --vehicle_count_;
    }

    static int getInstanceCount()
    {
        return vehicle_count_;
    }

private:
    int id_{};
    double speed_{};
    inline static int vehicle_count_{0};
};
```

需要注意：

- 静态数据成员不能放进成员初始化列表；
- 静态成员不参与普通逐成员复制；
- 拷贝构造会创建新对象，因此应增加存活计数；
- 拷贝赋值只修改已有对象，不增加计数；
- 析构函数负责减少存活计数；
- 当前存活对象数量与历史累计构造次数是两个不同指标。

## 14. 为什么隐式拷贝不会自动增加计数

如果只在普通带参构造函数中执行：

```cpp
++vehicle_count_;
```

编译器生成的隐式拷贝构造函数不会再进入这个带参构造函数的函数体。静态成员也不是每个对象的一部分，不会作为普通成员被复制。

因此：

```cpp
Vehicle first{1, 0.2};
Vehicle second{first};
```

若没有自定义拷贝构造维护计数，实际对象已有两个，但计数可能仍为一个。这是逻辑错误，不是编译错误，也不必然产生未定义行为。

教学示例可以通过自定义拷贝构造修正计数。更完整的工程类型还需要考虑移动构造、构造失败、线程并发等情况，因此手写全局对象计数不应被当作通用资源管理方案。

## 15. static 成员函数没有 this

静态成员函数属于类，不依赖具体对象，因此没有 `this` 指针：

```cpp
class Vehicle
{
public:
    static int getInstanceCount()
    {
        return vehicle_count_;
    }

private:
    inline static int vehicle_count_{0};
};
```

推荐通过类名调用：

```cpp
std::cout << Vehicle::getInstanceCount() << '\n';
```

即使还没有创建任何 `Vehicle` 对象，也可以调用这个函数。

| 特性 | 普通成员函数 | 静态成员函数 |
| --- | --- | --- |
| 是否依赖当前对象 | 是 | 否 |
| 是否有 `this` | 是 | 否 |
| 能否直接访问普通成员 | 能 | 不能 |
| 能否直接访问静态成员 | 能 | 能 |
| 能否通过显式对象访问私有成员 | 能 | 能 |
| 能否使用末尾 `const` | 能 | 不能 |
| 推荐调用方式 | `car.print()` | `Vehicle::getCount()` |

下面的声明非法：

```cpp
// static int getCount() const;
```

函数末尾的 `const` 限制的是通过 `this` 修改当前对象，而静态成员函数没有 `this`，所以不能这样声明。

## 16. 静态函数仍然拥有类的访问权限

静态成员函数不能直接访问普通成员，因为没有当前对象：

```cpp
static void reset()
{
    // speed_ = 0.0; // 不知道要修改哪个对象
}
```

但它可以通过显式传入的对象访问私有成员：

```cpp
class Vehicle
{
public:
    static void synchronize(
        Vehicle& target,
        const Vehicle& source)
    {
        target.speed_ = source.speed_;
    }

private:
    double speed_{};
};
```

调用：

```cpp
Vehicle::synchronize(car1, car2);
```

`target` 和 `source` 明确指定了具体对象，而且 `synchronize()` 是 `Vehicle` 的成员函数，所以它有权访问这些对象的私有成员。

静态成员函数和类外普通函数都没有 `this`，但前者属于类并拥有类的私有访问权限，后者默认没有。

## 17. 静态函数能否通过对象调用

静态成员函数也可以通过对象调用：

```cpp
car1.getInstanceCount();
```

语法上通常合法，但这个函数并没有使用 `car1`。为了准确表达它属于整个类，推荐写成：

```cpp
Vehicle::getInstanceCount();
```

相反，普通非静态成员函数需要具体对象，不能只使用类名调用：

```cpp
car1.print();        // 正确
// Vehicle::print(); // 错误：缺少当前对象
```

## 18. 静态工厂函数

静态工厂函数是不依赖已有对象、负责创建并返回对象的静态成员函数。

```cpp
class VehicleConfig
{
public:
    static VehicleConfig create(double max_speed)
    {
        VehicleConfig config;
        config.max_speed_ = max_speed;
        return config;
    }

    double getMaxSpeed() const
    {
        return max_speed_;
    }

private:
    double max_speed_{0.26};
};
```

调用时不需要先创建对象：

```cpp
VehicleConfig config{VehicleConfig::create(0.20)};
```

函数内部的局部对象按值返回是安全的，编译器还可能通过 NRVO 避免额外复制。

不能返回普通局部对象的引用：

```cpp
static VehicleConfig& createInvalid()
{
    VehicleConfig config;
    return config; // 错误：返回局部对象引用
}
```

函数结束后 `config` 被销毁，返回引用立即悬空，继续使用会导致未定义行为。

## 19. 返回值与接收类型共同决定是否复制

假设：

```cpp
Vehicle& Vehicle::getSelf()
{
    return *this;
}
```

以下两行含义不同：

```cpp
Vehicle& car3{car1.getSelf()}; // 绑定引用，不复制
Vehicle car4{car1.getSelf()};  // 拷贝构造新对象
```

即使函数返回引用，调用者仍然可以选择用值对象接收，从而触发复制。

判断是否创建新对象，需要同时观察：

- 函数返回类型；
- 返回表达式的值类别；
- 调用者接收结果的类型和初始化方式。

| 返回方式 | 安全性与含义 |
| --- | --- |
| 按值返回局部对象 | 安全，返回独立结果 |
| 引用返回局部对象 | 不安全，产生悬空引用 |
| `Vehicle&` 返回 `*this` | 当前对象仍存活时可安全引用 |
| `Vehicle` 返回 `*this` | 安全，但会创建返回副本 |

## 20. static 局部变量

`static` 也可以修饰函数内部的局部变量：

```cpp
void test()
{
    static int count{0};
    ++count;

    std::cout << count << '\n';
}
```

连续调用三次 `test()`，输出：

```text
1
2
3
```

静态局部变量只在第一次执行到声明时完成初始化，之后多次调用会继续使用同一个对象。自 C++11 起，函数内静态局部变量的初始化具有线程安全保证，但后续对变量本身的并发读写仍需根据情况同步。

| 对比项 | 普通局部变量 | static 局部变量 | static 数据成员 |
| --- | --- | --- | --- |
| 名称作用域 | 代码块 | 代码块 | 类作用域 |
| 存储期 | 通常随块执行 | 静态存储期 | 静态存储期 |
| 多次调用保留数据 | 否 | 是 | 是 |
| 是否属于具体对象 | 否 | 否 | 否 |

因此，不能把 `static` 的所有用途都简单理解为“属于整个类”。静态局部变量属于函数内部的局部作用域，只是生命周期贯穿程序运行阶段。

## 21. fork_planner 中的实际应用

本次继续阅读了 `fork_planner` 中与 `static` 和对象成员有关的代码。

### MultiVehicleConfig 与 PlannerParam

配置类型提供类似静态工厂函数：

```cpp
static MultiVehicleConfig fromROSParam(
    ros::NodeHandle& node_handle);
```

函数内部创建配置对象，从 ROS 参数服务器读取数据，最后按值返回：

```cpp
MultiVehicleConfig config{
    MultiVehicleConfig::fromROSParam(node_handle)
};
```

工厂函数是静态的，但返回对象中的普通配置成员并不是静态变量。不同配置对象仍然可以保存不同参数。

### PathGenerator

`PathGenerator` 包含类似角度归一化的私有静态工具函数：

```cpp
static double normalizeAngle(double angle);
```

该计算不依赖某个生成器对象的内部状态，设计为静态函数可以准确表达这种关系。

### PathTrack 与 VehicleAgent

`PathTrack` 中的路径、累计弧长和长度都是普通成员，每个路径对象分别维护自己的数据。`VehicleAgent` 的编号、速度和任务状态也属于具体车辆，而不是所有车辆共享的静态状态。

### TaskAllocator

`TaskAllocator` 中的配置引用、地图引用和路径生成器成员是普通引用或值成员。多个对象可以通过引用共享外部配置，并不意味着这些成员必须声明为 `static`。

共享数据可以通过引用、指针、所有权对象或静态成员等多种方式表达，选择应取决于所有权、生命周期和依赖关系，而不是只看“多个对象都会使用”。

## 22. 完整示例：this 与实例计数

下面的示例组合 `this`、`return *this`、静态成员和对象生命周期：

```cpp
#include <iostream>

class Vehicle
{
public:
    Vehicle(int id, double speed)
        : id_{id}, speed_{speed}
    {
        ++instance_count_;
        std::cout << "Construct " << id_ << '\n';
    }

    Vehicle(const Vehicle& other)
        : id_{other.id_}, speed_{other.speed_}
    {
        ++instance_count_;
        std::cout << "Copy construct " << id_ << '\n';
    }

    ~Vehicle()
    {
        std::cout << "Destruct " << id_ << '\n';
        --instance_count_;
    }

    Vehicle& setSpeed(double speed)
    {
        this->speed_ = speed;
        return *this;
    }

    double getSpeed() const
    {
        return speed_;
    }

    static int getInstanceCount()
    {
        return instance_count_;
    }

    static void synchronize(
        Vehicle& target,
        const Vehicle& source)
    {
        target.speed_ = source.speed_;
    }

private:
    int id_{};
    double speed_{};
    inline static int instance_count_{0};
};

void inspectByValue(Vehicle vehicle)
{
    std::cout
        << "Inside function: "
        << Vehicle::getInstanceCount()
        << '\n';
}

int main()
{
    Vehicle first{1, 0.20};

    {
        Vehicle second{2, 0.30};
        Vehicle third{second};

        first.setSpeed(0.25).setSpeed(0.28);
        Vehicle::synchronize(second, first);

        std::cout
            << "Inner scope: "
            << Vehicle::getInstanceCount()
            << '\n';

        inspectByValue(first);
    }

    std::cout
        << "Outer scope: "
        << Vehicle::getInstanceCount()
        << '\n';
}
```

这个程序体现了：

- 每次真正构造对象时增加存活计数；
- 拷贝构造同样创建新对象；
- 按值传参会为形参创建副本；
- 拷贝赋值或普通状态修改不会增加对象数量；
- 内层对象按逆构造顺序析构；
- `return *this` 返回引用后可以继续操作原对象；
- 静态函数通过类名访问共享计数；
- 静态函数可以通过显式对象参数访问同类私有成员。

这里只考虑了当前学习阶段使用的普通构造与拷贝构造。完整生产类型还要考虑移动构造和并发访问，计数器若跨线程使用也需要适当同步。

## 23. 本次学习中的典型误区

### 误以为末尾 const 修饰形参

末尾 `const` 限制的是通过 `this` 修改当前对象，与普通形参是否可修改无关。

### 误以为未修改成员的函数会重置状态

成员变量会保留此前修改结果，不会因为调用其他函数而恢复构造时的值。

### 混淆返回引用与返回副本

`return *this` 是否复制由返回类型决定；调用者用引用还是值接收，也会影响是否创建新对象。

### 在类内直接初始化普通 static 成员

普通可修改静态数据成员需要类外定义，或在 C++17 中使用 `inline static` 类内定义。

### 认为拷贝构造会自动增加静态计数

静态成员不参与逐成员复制，隐式拷贝构造也不会执行普通构造函数体中的计数逻辑。

### 给静态成员函数添加末尾 const

静态成员函数没有 `this`，因此不存在要限定的当前对象，不能使用成员函数末尾的 `const`。

### 认为静态函数不能通过对象调用

通常可以通过对象调用，但推荐使用类名，以准确表达函数不依赖该对象。

### 认为静态工厂必须返回引用

工厂函数按值返回局部对象是安全的；返回局部对象引用才会产生悬空引用。

## 24. 本篇总结

Day 11 的主线，是进一步理解成员函数正在操作哪个对象，以及哪些数据和函数不属于任何单独对象。

关键结论包括：

- `this` 是非静态成员函数中指向当前对象的隐含指针；
- `*this` 表示当前对象本身；
- 成员函数末尾的 `const` 限制通过 `this` 修改当前对象；
- 名称遮蔽发生时，可以使用 `this->` 或成员后缀区分成员和形参；
- `return *this` 返回引用还是副本取决于函数返回类型；
- 静态数据成员由整个类共享，不属于具体对象；
- C++17 可以使用 `inline static` 在类内定义可修改静态成员；
- 静态成员函数没有 `this`，不能直接访问普通对象成员；
- 静态成员函数仍然拥有类的私有访问权限；
- 对象存活计数需要覆盖所有构造和析构路径；
- 静态工厂函数可以在没有现有对象的情况下创建并按值返回结果；
- 静态局部变量拥有局部作用域和静态存储期；
- 多个对象共享数据不一定要用 `static`，还要考虑所有权和生命周期。

理解 `this` 与 `static` 后，类的两种视角会更加清晰：普通成员描述“这个对象自己的状态”，静态成员描述“整个类型共享的状态或能力”。
