---
title: C++ 学习笔记 03：const、constexpr 与函数设计
published: 2026-11-01
description: 记录 C++ const 与 constexpr 的区别、编译期和运行期计算、constexpr 函数、函数声明与定义、参数传递、数组形参及车辆速度限幅实践。
tags: [C++ 学习, C++, const, constexpr, 函数]
category: C++ 学习
draft: false
---

## 1. const：限制对象的修改

`const` 用来限制对象的修改。对于基本类型变量，完成初始化后就不能再通过变量名重新赋值：

```cpp
double speed{0.20};
const double max_speed{0.26};

speed = 0.25;      // 合法
max_speed = 0.30;  // 编译错误
```

const 变量必须在声明时初始化，但它的初始值不一定要在编译期确定，也可以来自普通变量或用户输入。

### const 值与 const 引用

观察下面的代码：

```cpp
double speed{0.20};

const double initial_speed{speed};
const double& observed_speed{speed};

speed = 0.25;
```

修改 `speed` 后：

```text
initial_speed = 0.20
observed_speed = 0.25
```

原因是：

- `const double initial_speed{speed}` 创建了一个独立的只读变量，只复制初始化时的数值；
- `const double& observed_speed{speed}` 创建了只读引用，始终绑定原对象。

判断是否为引用，关键是声明中有没有 `&`。仅仅使用 `const` 不会自动建立引用关系。

const 引用禁止通过该引用修改对象，但不会让原对象本身变成常量。只要存在其他合法的非 const 访问途径，原对象仍然可以发生变化。

## 2. 编译期与运行期

理解 `constexpr` 之前，需要先区分两个阶段：

- **编译期（Compile Time）**：编译器分析代码、检查类型并生成程序；
- **运行期（Run Time）**：程序启动后实际执行计算、读取输入和处理数据。

常量表达式（Constant Expression）是满足 C++ 语言规则、能够在编译期求值的表达式。

例如：

```cpp
int a{10};
const int b{a};
constexpr int c{10};
constexpr int d{c + 5};
```

这里：

- `a` 是普通变量，可以在运行期修改；
- `b` 初始化后不能修改，但它的初始化依赖普通变量 `a`；
- `c` 是编译期常量；
- `d` 由常量表达式 `c + 5` 初始化，值为 `15`。

下面的写法不合法：

```cpp
constexpr int value{a};
```

即使编译器能够看到 `a` 当前被初始化为 `10`，`a` 仍然是可修改的普通变量，不能在这里作为常量表达式使用。

## 3. const 与 constexpr 的区别

| 比较项目 | `const` | `constexpr` |
| --- | --- | --- |
| 初始化后能否修改 | 不能 | 不能 |
| 能否使用运行期数据初始化 | 可以 | 不可以 |
| 是否要求常量表达式初始化 | 不一定 | 是 |
| 主要用途 | 限制修改、提供只读访问 | 表达编译期常量与计算 |

可以把两者简单理解为：

```text
const：初始化之后不能改
constexpr：必须能够在编译期确定
```

不过，`const` 与常量表达式的关系还有更细致的规则。例如，使用常量表达式初始化的某些整型 const 变量，也能用于要求常量表达式的场合。因此不能简单理解为“只有 constexpr 才可能参与编译期计算”。

在新代码中，如果设计意图明确要求编译期常量，直接使用 `constexpr` 通常更清晰。

## 4. constexpr 函数

`constexpr` 不仅可以修饰变量，也可以修饰函数：

```cpp
constexpr double calculateDistance(double speed, double time)
{
    return speed * time;
}
```

这个函数既可以参与编译期计算，也可以在运行期正常调用。

### 编译期调用

```cpp
constexpr double distance{
    calculateDistance(0.2, 10.0)
};
```

传入参数都是常量表达式，因此结果可以在编译期求出。

### 运行期调用

```cpp
double speed{0.2};
double distance{
    calculateDistance(speed, 10.0)
};
```

这同样合法，只是 `speed` 是运行期变量，调用结果也不再是常量表达式。

下面的写法则不合法：

```cpp
double speed{0.2};
constexpr double distance{
    calculateDistance(speed, 10.0)
};
```

`distance` 被声明为 `constexpr`，但初始化表达式依赖普通变量 `speed`，无法在编译期求值。

需要记住：constexpr 函数表示“具备在编译期求值的能力”，不表示每次调用都必须发生在编译期。运行期调用是否被编译器进一步优化，是另一个问题。

## 5. 工程中如何选择 const 与 constexpr

在 ROS 或其他实际 C++ 工程中，很多参数看起来是固定值，例如：

- 车辆轴距；
- 最大转向角；
- 轨迹采样周期；
- 地图分辨率；
- 最大速度。

如果这些数值允许通过配置文件、命令行或 ROS 参数服务器加载，它们的最终值要到运行期才能确定，就不能简单声明为 `constexpr`。

这类参数通常使用普通变量保存，并根据接口需要通过 const 引用或只读成员函数提供访问。

因此，`constexpr` 并不是比 `const` “更高级”的写法。选择依据应当是：

- 数据是否必须在编译期确定；
- 数据是否允许在运行期配置；
- 是否需要用于数组大小、模板参数等编译期场景；
- 接口只是限制修改，还是明确表达编译期计算。

## 6. 函数声明、定义与返回值

函数能够封装重复逻辑、明确输入输出接口，提高代码的可读性和复用性。

函数声明告诉编译器函数的名称、返回类型和参数类型：

```cpp
double calculateDistance(double speed, double time);
```

函数定义则提供具体实现：

```cpp
double calculateDistance(double speed, double time)
{
    return speed * time;
}
```

实际工程中，通常将函数声明放在 `.h` 或 `.hpp` 头文件中，将非内联函数的定义放在 `.cpp` 文件中。

### return 不会自动修改调用者变量

观察下面的限速函数：

```cpp
double limitSpeed(double speed)
{
    if (speed > 0.26)
    {
        speed = 0.26;
    }

    return speed;
}
```

直接调用但不接收返回值：

```cpp
double speed{0.30};
limitSpeed(speed);
```

原变量 `speed` 仍然是 `0.30`，因为函数修改的只是形参副本。

要保留函数计算结果，需要显式接收返回值：

```cpp
speed = limitSpeed(speed);
```

此时 `speed` 才会变为 `0.26`。

`return` 的作用是结束当前函数并向调用者提供结果，不等于自动把结果写回传入的变量。

## 7. 函数参数的三种传递方式

| 参数形式 | 传递机制 | 能否通过形参修改原变量 | 典型用途 |
| --- | --- | --- | --- |
| `double value` | 值传递，复制数值 | 否 | 普通数值计算 |
| `double& value` | 非 const 引用传递 | 是 | 修改调用者状态 |
| `const T& value` | 只读引用传递 | 否 | 避免复制较大对象并保护接口 |

例如：

```cpp
double limitSpeed(double speed, double max_speed);
void updateSpeed(double& speed, double max_speed);
void printPoint(const TrajectoryPoint& point);
```

需要注意：

- `const double speed` 仍然是值传递，`const` 只禁止函数内部修改形参副本；
- `int`、`double` 等小型基本类型通常直接值传递即可；
- 较大的结构体和容器可以通过 `const T&` 避免不必要的复制；
- 需要直接修改调用者对象时，可以使用非 const 引用；
- 如果函数只是根据输入计算新结果，通常优先考虑返回值，让数据流更明确。

## 8. 数组作为函数参数

综合练习中需要统计数组中的超速元素：

```cpp
int countOverspeed(
    const double speeds[],
    int size,
    double max_speed
);
```

三个参数分别表示速度数据、元素数量和最大允许速度。

普通数组作为函数参数时，会发生数组到指针的调整。形参：

```cpp
const double speeds[]
```

在函数参数列表中实际等价于：

```cpp
const double* speeds
```

函数接收的不是整个数组副本，也不会自动知道数组长度，因此必须额外传入 `size`。

这也解释了为什么范围 `for` 可以直接遍历 `main()` 中的原生数组：

```cpp
for (const auto& speed : speeds)
{
}
```

却不能直接遍历已经作为函数形参的 `speeds`。进入函数后，它已经被调整为指针，无法仅通过指针确定遍历终点。

在函数中可以使用下标循环：

```cpp
for (int i{0}; i < size; ++i)
{
    std::cout << speeds[i] << '\n';
}
```

## 9. 获取原生数组长度

传统写法是：

```cpp
int size = sizeof(speeds) / sizeof(speeds[0]);
```

前提是 `speeds` 在当前作用域中仍然是真正的数组。不能在数组形参上使用这段代码计算原数组长度，因为函数形参中的 `speeds` 已经是指针。

C++17 可以使用更清晰的 `std::size`：

```cpp
#include <iterator>

const auto size = std::size(speeds);
```

它仍然要求传入的对象保留数组或容器信息，但比手动相除更直观，也不需要重复写出元素类型。

## 10. 综合练习：车辆限速与轨迹预测

本次任务包括：

- 使用 `constexpr` 定义最大速度、采样周期和预测步数；
- 计算固定的预测时间；
- 在修改数组前统计原始超速点；
- 通过引用完成速度限幅；
- 使用 constexpr 函数计算预测距离；
- 输出限速后的速度和对应预测距离。

完整代码如下：

```cpp
#include <iomanip>
#include <iostream>
#include <iterator>

constexpr double calculateDistance(double speed, double time)
{
    return speed * time;
}

void limitSpeed(double& speed, double max_speed)
{
    if (speed > max_speed)
    {
        speed = max_speed;
    }
}

int countOverspeed(
    const double speeds[],
    int size,
    double max_speed
)
{
    int count{};

    for (int i{0}; i < size; ++i)
    {
        if (speeds[i] > max_speed)
        {
            ++count;
        }
    }

    return count;
}

int main()
{
    constexpr double max_speed{0.26};
    constexpr double sample_period{0.1};
    constexpr int prediction_steps{150};
    constexpr double prediction_time{
        sample_period * prediction_steps
    };

    double speeds[]{0.20, 0.28, 0.15, 0.32, 0.25};
    const int speed_count{
        static_cast<int>(std::size(speeds))
    };

    const int overspeed_count{
        countOverspeed(speeds, speed_count, max_speed)
    };

    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Prediction time: "
              << prediction_time << " s\n";
    std::cout << "Original overspeed points: "
              << overspeed_count << '\n';

    std::cout << "Limited speeds (m/s): ";
    for (auto& speed : speeds)
    {
        limitSpeed(speed, max_speed);
        std::cout << speed << ' ';
    }
    std::cout << '\n';

    std::cout << "Predicted distances (m): ";
    for (const auto& speed : speeds)
    {
        const double distance{
            calculateDistance(speed, prediction_time)
        };
        std::cout << distance << ' ';
    }
    std::cout << '\n';

    return 0;
}
```

运行结果：

```text
Prediction time: 15.00 s
Original overspeed points: 2
Limited speeds (m/s): 0.20 0.26 0.15 0.26 0.25
Predicted distances (m): 3.00 3.90 2.25 3.90 3.75
```

这里有几个关键点：

1. 超速统计必须在限速之前完成，否则原始超速信息会丢失；
2. `prediction_time` 完全由编译期常量计算，可以声明为 `constexpr`；
3. `limitSpeed()` 通过非 const 引用直接修改数组元素；
4. 距离循环实际调用了已经封装的 `calculateDistance()`；
5. `distance` 每轮只初始化一次且不再修改，因此声明为 `const`。

如果希望数组长度自动跟随初始化列表变化，也可以用 `std::size(speeds)` 获取长度，再在调用需要 `int` 的旧式接口时进行显式转换。更现代的接口还可以使用 `std::array`、容器引用或 `std::span`，避免单独传递裸指针和长度。

## 11. 本篇总结

这次学习的核心结论包括：

- `const` 表示对象初始化后不能通过该名称修改，但初始值可以来自运行期；
- const 值会复制数据，const 引用会绑定原对象，两者不能混淆；
- `constexpr` 明确要求初始化表达式能够在编译期求值；
- constexpr 函数可以在编译期求值，也可以接受运行期参数正常执行；
- 运行期可配置参数通常不能声明为 `constexpr`；
- 函数声明描述接口，函数定义提供实现；
- 值传递修改的是副本，返回值必须由调用者接收才会影响后续变量；
- 非 const 引用适合修改调用者对象，const 引用适合只读访问较大对象；
- 原生数组作为函数参数时会调整为指针，函数无法自动得知元素数量；
- 在数组仍保留完整类型信息的作用域中，可以使用 `std::size` 获取长度。

综合练习把编译期常量、函数封装、引用修改、数组参数和范围 `for` 串联到了一起，也进一步说明：const 与 constexpr 没有绝对的高低之分，正确选择取决于数据究竟在什么时候确定，以及接口是否需要修改对象。
