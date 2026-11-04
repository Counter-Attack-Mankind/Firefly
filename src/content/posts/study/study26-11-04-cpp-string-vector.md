---
title: C++ 学习笔记 05：std::string、std::vector 与车辆数据处理
published: 2026-11-04
description: 记录 C++ std::string 和 std::vector 的基本操作、cin 与 getline、size 与 capacity、范围 for、引用传参、结构体封装及车辆速度限幅实践。
tags: [C++ 学习, C++, std::string, std::vector, 容器]
category: C++ 学习
draft: false
---

## 1. 从字符数组到 std::string

C 语言通常使用字符数组保存字符串，并用空字符 `'\0'` 表示字符串结束：

```cpp
char name[]{"AGV01"};
```

这个数组实际包含 6 个字符元素：

```text
A G V 0 1 \0
```

因此：

```cpp
sizeof(name);   // 6
strlen(name);   // 5，需要包含 <cstring>
```

C++ 标准库提供了 `std::string`，能够自动管理字符串存储，并支持赋值、拼接、比较和长度查询：

```cpp
#include <string>

std::string name{"AGV01"};

name = "AGV02";
name += "_front";
```

常见操作如下：

```cpp
name.size();                // 字符数量
name.length();              // 与 size() 等价
name.empty();               // 是否为空
name == "AGV02_front";     // 比较内容
name[0];                    // 访问第一个字符
name.at(0);                 // 带边界检查的访问
```

在 ROS 和其他工程中，`std::string` 常用于节点名称、话题名称、文件路径和配置参数等文本数据。

## 2. 字符串赋值和拼接会产生独立内容

普通的 `std::string` 赋值会复制字符串内容：

```cpp
std::string vehicle{"AGV01"};
std::string topic{"/" + vehicle + "/odom"};

vehicle = "AGV02";
```

修改 `vehicle` 后，已经创建的 `topic` 仍然是：

```text
/AGV01/odom
```

`topic` 不会自动跟随 `vehicle` 更新，因为拼接时已经生成了独立的字符串对象。

字符串下标从 `0` 开始。使用 `operator[]` 越界访问可能导致未定义行为；需要边界检查时可以使用 `at()`：

```cpp
char first{name.at(0)};
```

如果下标越界，`at()` 会抛出 `std::out_of_range` 异常，而不是静默访问无效位置。

## 3. cin 与 getline 的区别

使用流提取运算符读取字符串：

```cpp
std::string name;
std::cin >> name;
```

`std::cin >> name` 会跳过前导空白，然后读取到下一个空白字符为止。空格、制表符和换行符都会结束当前字符串的读取。

如果输入：

```text
AGV 01
```

`name` 只能得到：

```text
AGV
```

需要读取包含空格的一整行时，应使用 `std::getline()`：

```cpp
std::getline(std::cin, name);
```

它会读取当前行剩余内容，直到遇到换行符，并丢弃这个换行符。

### 混用 cin >> 与 getline

假设输入：

```text
AGV01 STOP
```

执行：

```cpp
std::string first;
std::string rest;

std::cin >> first;
std::getline(std::cin, rest);
```

结果是：

```text
first = "AGV01"
rest = " STOP"
```

因为 `operator>>` 停在 `AGV01` 后面的空格处，`getline()` 会继续读取当前行剩余内容，开头的空格也会被保留。

如果 `operator>>` 后剩下的第一个字符正好是换行符，紧接着调用 `getline()` 就会读到空字符串。

读取下一行前，可以忽略当前行的剩余内容：

```cpp
#include <limits>

std::cin.ignore(
    std::numeric_limits<std::streamsize>::max(),
    '\n'
);
```

也可以在需要跳过前导空白时使用：

```cpp
std::getline(std::cin >> std::ws, name);
```

`std::ws` 会消费前导空白，因此适合在格式化输入后读取下一段非空行文本。它也会跳过用户有意输入的行首空格，是否采用应根据输入规则决定。

## 4. 字符串的函数参数

函数只读取字符串时，通常使用 const 引用：

```cpp
void printName(const std::string& name)
{
    std::cout << name << '\n';
}
```

这样可以避免复制字符串，同时禁止函数通过 `name` 修改原对象。

需要修改原字符串时使用非 const 引用：

```cpp
void appendSuffix(std::string& name)
{
    name += "_front";
}
```

值传递则会创建独立副本：

```cpp
void renameCopy(std::string name)
{
    name = "temporary";
}
```

函数内部修改 `name` 不会影响调用者的字符串。

### c_str() 与 C 接口

`std::string` 与 `char*` 不是同一种类型。调用需要 C 风格字符串的只读接口时，可以使用：

```cpp
const char* text{name.c_str()};
```

这个指针指向字符串对象管理的内部存储。原字符串被销毁，或执行可能改变其存储的非 const 操作后，之前保存的指针可能失效，不能长期脱离原字符串对象使用。

## 5. std::vector：动态数组容器

`std::vector` 是 C++ 标准库中的顺序容器，需要包含 `<vector>`：

```cpp
#include <vector>

std::vector<double> speeds{0.18, 0.28, 0.32};
```

与固定长度的原生数组不同，vector 可以根据需要增加或删除元素，适合保存数量不固定的速度采样点、轨迹点序列及其他规划数据。

`std::vector<double>` 中的 `double` 表示容器元素类型。vector 是模板类型，模板机制将在后续课程中继续学习。

常见操作：

```cpp
speeds.push_back(0.25);  // 在末尾添加元素
speeds.size();           // 当前元素数量
speeds.capacity();       // 当前已分配容量
speeds.empty();          // 是否没有元素
speeds[1] = 0.26;        // 修改第二个元素
speeds.at(1) = 0.26;     // 带边界检查地修改
speeds.clear();          // 移除全部元素
```

## 6. size 与 capacity

`size()` 和 `capacity()` 表示不同概念：

- `size()`：当前实际存在的元素数量；
- `capacity()`：当前已分配空间在不重新分配的情况下能够容纳的元素数量。

通常满足：

```text
capacity() >= size()
```

`push_back()` 会在末尾创建一个新元素，因此 `size()` 增加 1。当当前容量不足时，vector 会申请更大的存储空间并搬移已有元素。

`clear()` 会移除全部元素，使 `size()` 变为 0，但不会缩减 `capacity()`。清空后仍然可以继续添加新元素。

需要特别注意：下标赋值不会自动扩容。

```cpp
std::vector<double> speeds{0.18, 0.28, 0.32, 0.25};

speeds[4] = 0.20;  // 错误：当前合法下标只有 0～3
```

新增第五个元素应使用：

```cpp
speeds.push_back(0.20);
```

`operator[]` 不执行边界检查，越界访问属于未定义行为。需要检查时使用 `at()`。

## 7. vector 的复制与引用

两个 vector 之间进行普通赋值会复制全部元素：

```cpp
std::vector<double> a{0.18, 0.28};
std::vector<double> b{a};

a.clear();
```

此时：

```text
a.size() == 0
b 仍然保存 0.18 和 0.28
```

`a` 和 `b` 是两个相互独立的容器。修改或清空其中一个，不会自动影响另一个。

如果显式创建引用，才会访问同一个容器：

```cpp
std::vector<double>& alias{a};
```

引用是原对象的别名，而普通 vector 复制会产生独立的数据集合。

## 8. 范围 for：元素不是下标

范围 `for` 会依次取得容器中的元素：

| 写法 | 含义 | 能否修改原元素 |
| --- | --- | --- |
| `auto speed` | 获取元素副本 | 否 |
| `auto& speed` | 引用原始元素 | 可以 |
| `const auto& speed` | 只读引用原始元素 | 不可以通过该引用修改 |

对速度序列进行限幅：

```cpp
for (auto& speed : speeds)
{
    if (speed > 0.26)
    {
        speed = 0.26;
    }
}
```

`speed` 引用 vector 中的实际元素，因此修改能够作用于原容器。

如果写成：

```cpp
for (auto speed : speeds)
```

循环变量只是副本，修改不会影响 vector。

### 常见错误：把元素值当成下标

下面的写法是错误的：

```cpp
for (int i : speeds)
{
    if (speeds[i] > max_speed)
    {
        speeds[i] = max_speed;
    }
}
```

范围 `for` 中的 `i` 表示当前元素的值，而不是元素下标。由于容器保存的是 `double`，例如 `0.28` 会先转换为整数 `0`，程序可能反复访问 `speeds[0]`。

如果某个元素转换后得到较大的整数，还可能造成越界访问。

需要直接修改元素时使用引用遍历：

```cpp
for (auto& speed : speeds)
```

确实需要下标时使用传统循环：

```cpp
for (std::size_t i{0}; i < speeds.size(); ++i)
{
    std::cout << i << ": " << speeds[i] << '\n';
}
```

直接遍历适合限速和状态更新；下标循环更适合计算相邻轨迹点之间的距离、曲率或速度差。

## 9. vector 与输入

C++17 标准库没有为 `std::vector<double>` 提供直接读取整个容器的 `operator>>`，因此不能写：

```cpp
std::cin >> speeds;  // 编译错误
```

正确做法是先读取单个元素，再使用 `push_back()`：

```cpp
std::vector<double> speeds;

for (int i{0}; i < 3; ++i)
{
    double speed{};

    if (!(std::cin >> speed))
    {
        return false;
    }

    speeds.push_back(speed);
}
```

循环读取三次不表示用户必须按三次 Enter。输入：

```text
0.18 0.28 0.32
```

然后按一次 Enter，就能依次读取三个数值。空格、制表符和换行都可以分隔数字。

如果用户输入五个数字，但程序只循环读取三次，通常只会消费前三个，剩余内容仍留在输入流中。

vector 不要求在创建时确定元素数量，但程序必须定义输入何时结束。常见方案包括：

- 先读取数量，再读取指定个数的元素；
- 读取到文件结束；
- 使用明确的结束标志；
- 读取完整一行后自行解析。

输入能够转换为 `double` 只代表语法有效，不代表业务数据合理。例如负数可以成功读取为 `double`，但车辆速度如果表示大小，通常还需要检查是否非负、是否有限以及是否超出合理范围。

## 10. 使用 struct 封装车辆数据

可以使用结构体把车辆名称、最大速度和速度序列组织在一起：

```cpp
struct Vehicle
{
    std::string name;
    double max_speed{};
    std::vector<double> speeds;
};
```

创建对象后，通过点运算符访问成员：

```cpp
Vehicle car{};

car.name = "AGV01";
car.max_speed = 0.26;
car.speeds.push_back(0.20);
```

需要修改车辆对象的函数使用非 const 引用：

```cpp
void limitSpeeds(Vehicle& vehicle)
{
    for (auto& speed : vehicle.speeds)
    {
        if (speed > vehicle.max_speed)
        {
            speed = vehicle.max_speed;
        }
    }
}
```

只读取车辆对象的函数使用 const 引用：

```cpp
void printSpeeds(const Vehicle& vehicle)
{
    for (const auto& speed : vehicle.speeds)
    {
        std::cout << speed << ' ';
    }
}
```

函数定义时需要写出参数类型：

```cpp
void limitSpeeds(Vehicle& vehicle);
```

调用时只传递对象表达式：

```cpp
limitSpeeds(car);
```

不能写成 `limitSpeeds(Vehicle& car)`，因为类型声明只出现在函数声明或定义中。

结构体不需要额外保存 `trajectory_count`。需要数量时直接使用：

```cpp
vehicle.speeds.size()
```

避免重复存储同一信息，可以减少数量字段与容器实际内容不一致的风险。

## 11. 综合练习：仓储车辆速度限幅

下面的程序读取车辆名称、最大速度和速度采样序列。输入过程先写入临时对象，所有数据校验成功后再赋值给目标车辆，避免输入中途失败后留下只更新了一半的对象。

```cpp
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

struct Vehicle
{
    std::string name;
    double max_speed{};
    std::vector<double> speeds;
};

bool getInput(Vehicle& vehicle)
{
    Vehicle candidate{};
    int sample_count{};

    std::cout << "Vehicle name: ";
    if (!std::getline(std::cin >> std::ws, candidate.name))
    {
        return false;
    }

    std::cout << "Maximum speed: ";
    if (!(std::cin >> candidate.max_speed) ||
        candidate.max_speed < 0.0)
    {
        return false;
    }

    std::cout << "Number of samples: ";
    if (!(std::cin >> sample_count) ||
        sample_count <= 0 || sample_count > 1000)
    {
        return false;
    }

    candidate.speeds.reserve(
        static_cast<std::size_t>(sample_count)
    );

    std::cout << "Speed samples: ";
    for (int i{0}; i < sample_count; ++i)
    {
        double speed{};

        if (!(std::cin >> speed) || speed < 0.0)
        {
            return false;
        }

        candidate.speeds.push_back(speed);
    }

    vehicle = candidate;
    return true;
}

void limitSpeeds(Vehicle& vehicle)
{
    for (auto& speed : vehicle.speeds)
    {
        if (speed > vehicle.max_speed)
        {
            speed = vehicle.max_speed;
        }
    }
}

void printSpeeds(const Vehicle& vehicle)
{
    std::cout << "Vehicle: " << vehicle.name << '\n';

    for (const auto& speed : vehicle.speeds)
    {
        std::cout << speed << ' ';
    }

    std::cout << '\n';
}

int main()
{
    Vehicle vehicle{};

    if (!getInput(vehicle))
    {
        std::cerr << "Invalid vehicle data.\n";
        return 1;
    }

    std::cout << std::fixed << std::setprecision(2);

    std::cout << "Before limit:\n";
    printSpeeds(vehicle);

    limitSpeeds(vehicle);

    std::cout << "After limit:\n";
    printSpeeds(vehicle);

    return 0;
}
```

示例输入：

```text
Warehouse Forklift
0.26
5
0.18 0.28 0.32 0.15 0.25
```

输出结果：

```text
Before limit:
Vehicle: Warehouse Forklift
0.18 0.28 0.32 0.15 0.25
After limit:
Vehicle: Warehouse Forklift
0.18 0.26 0.26 0.15 0.25
```

这个程序体现了以下设计：

- `std::string` 保存可包含空格的车辆名称；
- `std::vector<double>` 保存数量可变的速度采样；
- `reserve()` 根据已知数量提前预留容量，但不创建元素；
- `push_back()` 真正向容器末尾添加元素；
- `Vehicle&` 允许限速函数修改原车辆；
- `const Vehicle&` 为输出函数提供只读访问；
- `getInput()` 返回 `bool`，调用者必须检查输入是否成功；
- 临时对象 `candidate` 避免失败输入破坏已有车辆数据。

当前示例检查了输入失败、负数和采样数量范围。更完整的工程代码还可以使用 `std::isfinite()` 排除无穷大与 NaN，并提供重新输入或错误恢复流程。

## 12. 本篇总结

这次学习的核心结论包括：

- `std::string` 自动管理字符串存储，支持赋值、拼接、比较和长度查询；
- `operator>>` 读取到空白为止，`getline()` 读取当前行剩余内容；
- `std::vector` 是元素数量可以动态变化的顺序容器；
- `size()` 表示实际元素数量，`capacity()` 表示当前已分配容量；
- `push_back()` 能增加元素，下标赋值不能扩展容器；
- vector 的普通赋值复制元素，不会建立引用关系；
- 范围 `for` 遍历的是元素，不是下标；
- `auto` 获得副本，`auto&` 引用原元素，`const auto&` 提供只读引用；
- C++17 标准库不能直接通过 `std::cin >> vector` 读取整个容器；
- 结构体可以把名称、参数和采样序列组织为一个车辆数据模型；
- 修改对象的函数使用非 const 引用，只读函数通常使用 const 引用。

这一篇把字符串、动态容器、范围遍历、引用传参和结构体封装结合到了一起，为后续学习 `reserve()`、`resize()`、扩容和引用失效打下基础。
