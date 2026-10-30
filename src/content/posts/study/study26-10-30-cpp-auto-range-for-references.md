---
title: C++ 学习笔记 02：auto、范围 for 与引用语义
published: 2026-10-30
description: 记录 C++ auto 类型推导、范围 for 的值与引用遍历、引用和指针的区别、函数参数传递、引用返回值、const 引用及临时对象生命周期。
tags: [C++ 学习, C++, auto, 范围 for, 引用]
category: C++ 学习
draft: false
---

## 1. auto 是编译期类型推导

`auto` 是 C++11 引入的类型占位符。编译器会根据初始化表达式推导变量类型：

```cpp
auto a = 10;     // int
auto b = 3.14;   // double
auto c = 'A';    // char
```

类型推导发生在编译阶段，而不是运行阶段。变量的类型一旦确定，就不会因为后续赋值而改变：

```cpp
auto a = 5;    // a 是 int
auto b = 2.5;  // b 是 double

a = b;
std::cout << a << ' ' << b << '\n';
```

输出结果为：

```text
2 2.5
```

`a` 始终是 `int`。将 `double` 类型的 `2.5` 赋给它时会发生隐式类型转换，小数部分被截去。

普通局部变量使用 `auto` 时必须提供能够用于推导类型的初始化表达式：

```cpp
auto x;  // 错误：编译器无法推导 x 的类型
```

### auto 与花括号初始化

在 C++17 中，下面两种写法都会将变量推导为 `int`：

```cpp
auto a = 10;
auto b{10};
```

但加入等号和花括号后，含义会发生变化：

```cpp
auto c = {10};  // std::initializer_list<int>
```

因此，`auto` 与花括号初始化组合时需要留意具体语法，不能只看括号里的元素。

## 2. 为什么需要 auto

对于 `int`、`double` 这类简单类型，直接写出类型通常更加直观：

```cpp
double speed{0.25};
```

`auto` 的主要价值是避免重复书写冗长类型。例如遍历容器时：

```cpp
std::vector<double>::iterator it = speeds.begin();
```

可以简化为：

```cpp
auto it = speeds.begin();
```

这不仅减少重复代码，也能让变量类型与初始化表达式的实际返回类型保持一致。

不过，`auto` 并不是越多越好。如果类型信息对理解代码很重要，显式写出类型可能更清晰。工程中应以可读性为判断标准。

### auto 用于函数

C++14 开始，普通函数可以让编译器推导返回类型：

```cpp
auto add(int a, int b)
{
    return a + b;
}
```

C++20 还允许普通函数形参直接使用 `auto`，形成简写函数模板：

```cpp
auto identity(auto value)
{
    return value;
}
```

但当前学习环境以 C++17 为主，不能使用这种 C++20 的简写形参。需要接收多种类型时，可以使用传统函数模板；类型固定时，则直接写出 `double`、`double&` 等明确类型。

## 3. 范围 for 循环

C++11 引入了范围 `for`，用于简洁地遍历数组或容器：

```cpp
for (元素声明 : 数组或容器)
{
    // 循环体
}
```

例如：

```cpp
double speeds[3]{0.20, 0.30, 0.15};

for (auto speed : speeds)
{
    std::cout << speed << ' ';
}
```

范围 `for` 必须包含循环变量声明，不能写成：

```cpp
for (: speeds)  // 错误
{
}
```

循环变量既可以保存元素副本，也可以引用原始元素。两者的区别非常重要。

| 写法 | 含义 | 是否复制元素 | 能否修改原元素 |
| --- | --- | --- | --- |
| `auto value` | 值拷贝 | 是 | 否 |
| `auto& value` | 非 const 引用 | 否 | 是 |
| `const auto& value` | 只读引用 | 否 | 否 |

## 4. 值遍历与引用遍历

先看值遍历：

```cpp
int nums[3]{10, 20, 30};

for (auto n : nums)
{
    n += 5;
}
```

循环结束后，数组仍然是：

```text
10 20 30
```

因为每次循环中的 `n` 都是数组元素的副本，修改 `n` 不会影响原数组。

如果希望直接修改数组元素，需要使用引用：

```cpp
for (auto& n : nums)
{
    n += 5;
}
```

此时数组会变成：

```text
15 25 35
```

如果只想读取元素，并且希望避免复制较大的对象，可以使用只读引用：

```cpp
for (const auto& value : container)
{
    std::cout << value << '\n';
}
```

选择方式可以简单归纳为：

- 元素很小且只读：可以直接使用 `auto value`；
- 需要修改原元素：使用 `auto& value`；
- 元素较大且只读：通常使用 `const auto& value`。

如果需要访问下标、相邻元素或指定区间，传统下标循环有时反而更合适：

```cpp
for (int i = 0; i < count; ++i)
{
    // 使用 i 访问位置或相邻元素
}
```

## 5. 引用是对象的别名

引用使用 `&` 声明：

```cpp
int a{10};
int& ref{a};

ref = 20;
```

`ref` 是 `a` 的引用，可以理解为同一个对象的另一个名字。修改 `ref` 就是在修改 `a`，因此执行后 `a` 的值也是 `20`。

引用不是一个独立的整数副本。从语言层面看，它表达的是别名关系。编译器内部可能借助地址实现引用，但编写代码时不应简单地把引用等同于一个必然额外占用空间的指针。

在同一个作用域中，如果只是操作一个简单变量，没有必要为了使用引用而额外创建别名。引用真正有价值的场景包括：

- 让函数直接修改调用者的对象；
- 避免传递或遍历时复制较大的对象；
- 从函数返回某个仍然有效的对象；
- 在范围 `for` 中直接访问原始元素。

## 6. 引用与指针的区别

引用和指针都能间接访问对象，但语法和约束不同：

| 特性 | 指针 `int* pointer` | 引用 `int& reference` |
| --- | --- | --- |
| 声明时是否必须绑定对象 | 不必须 | 必须 |
| 能否改为指向其他对象 | 可以 | 不能重新绑定 |
| 能否表示“没有对象” | 可以使用 `nullptr` | 正常有效引用不能表示空对象 |
| 修改目标对象 | `*pointer = 20` | `reference = 20` |
| 是否需要显式解引用 | 需要 | 不需要 |

观察下面的代码：

```cpp
int a{10};
int b{20};

int* pointer{&a};
int& reference{a};

pointer = &b;
reference = 30;
*pointer = 40;
```

最终结果为：

```text
a = 30
b = 40
reference = 30
```

原因是：

- `pointer = &b` 改变了指针保存的地址；
- `reference = 30` 没有改变引用关系，而是把 `30` 赋给 `a`；
- `*pointer = 40` 通过指针修改了 `b`。

同样，下面的语句也不是重新绑定引用：

```cpp
reference = b;
```

它表示把 `b` 的值赋给 `reference` 所引用的 `a`。

如果需要引用一个指针变量，类型应写成：

```cpp
int*& pointer_reference{pointer};
```

`int& reference{pointer};` 会因为类型不匹配而编译失败。

## 7. 函数参数的三种常见传递方式

函数参数是引用最重要的使用场景之一。

### 值传递

```cpp
void change(int value)
{
    value = 100;
}

int a{10};
change(a);
```

调用结束后 `a` 仍然是 `10`。形参 `value` 是一个独立的局部对象，函数修改的是副本。

### 非 const 引用传递

```cpp
void change(int& value)
{
    value = 100;
}

int a{10};
change(a);
```

这次调用结束后 `a` 变为 `100`，因为形参 `value` 引用了调用者的对象。

如果先调用 `change(a)`，再调用 `change(b)`，并不表示同一个引用从 `a` 重新绑定到了 `b`。每次函数调用都会创建自己的形参引用：第一次调用结束后，其形参生命周期结束；第二次调用会创建新的形参，并绑定到新的实参。

### const 引用传递

当函数只需要读取较大的对象时，可以使用 `const T&`：

```cpp
struct TrajectoryPoint
{
    double x;
    double y;
    double heading;
    double velocity;
    double acceleration;
};

void printPoint(const TrajectoryPoint& point)
{
    std::cout << point.x << ' ' << point.y << '\n';
}
```

这样既不需要复制整个结构体，也能禁止函数通过 `point` 修改原对象。

常见设计方式可以归纳为：

```cpp
void f1(double speed);         // 值传递
void f2(double& speed);        // 可修改引用
void f3(const Point& point);   // 只读引用
```

- `int`、`double` 等简单数值类型通常直接值传递；
- 需要修改调用者对象时使用非 const 引用；
- 只读访问较大对象并希望避免复制时使用 const 引用。

## 8. 函数返回引用

引用也可以作为函数返回类型：

```cpp
int& getValue(int& value)
{
    return value;
}
```

因为函数返回的是引用，调用表达式代表传入的原对象：

```cpp
int a{10};
getValue(a) = 20;
```

执行后 `a` 的值变为 `20`。

如果返回类型改为普通的 `int`：

```cpp
int getValue(int& value)
{
    return value;
}
```

函数返回的就是一个整数值，而不是原变量的引用。参数是否按引用传递，与返回值是否为引用，是两个相互独立的问题。

### auto 接收引用返回值

即使函数返回 `int&`，普通 `auto` 也通常会去掉引用属性：

```cpp
int& getValue(int& value)
{
    return value;
}

int a{10};

auto value_copy = getValue(a);       // int，独立副本
auto& value_reference = getValue(a); // int&，保留引用
```

接着执行：

```cpp
value_copy += 5;       // value_copy = 15，a 仍然是 10
value_reference += 10; // a = 20
a += 20;               // a = 40，value_reference 读取到 40
```

最终结果为：

```text
a = 40
value_copy = 15
value_reference = 40
```

如果需要保留引用关系，就必须显式写出 `auto&`。

### 不要返回局部变量的引用

下面的设计是错误的：

```cpp
int& getValue()
{
    int value{10};
    return value;
}
```

`value` 是函数内部的局部对象。函数结束后，它的生命周期随之终止，返回的引用会变成悬空引用。继续通过这个引用访问对象会产生未定义行为。

返回引用之前，必须确认被引用对象在函数结束后仍然存在。

## 9. const 引用限制的是访问途径

观察下面的代码：

```cpp
int a{10};
const int& read_only{a};
```

`read_only` 是只读引用，不能通过它修改所引用的对象：

```cpp
a = 20;          // 合法
read_only = 30;  // 编译错误
```

这里的 `a` 并没有因为存在一个 const 引用而变成常量。通过 `a` 修改对象后，`read_only` 读取到的也会是新值 `20`。

如果希望对象本身不可修改，需要在对象声明中加入 `const`：

```cpp
const int a{10};
const int& read_only{a};
```

还可以同时存在只读引用和可修改引用：

```cpp
int a{10};
const int& read_only{a};
int& writable{a};

writable = 30;
```

此时 `a`、`read_only` 和 `writable` 读取到的都是 `30`。虽然不能通过 `read_only` 修改对象，但其他合法的非 const 访问途径仍然可以修改它。

可以这样区分：

- `const int`：对象本身声明为不可修改；
- `const int&`：不能通过这个引用修改对象，但对象可能通过其他途径发生变化。

## 10. 左值、右值与临时对象

现阶段可以先通过典型例子理解值类别：

- 变量名 `a` 通常是左值；
- 字面量 `10` 是右值；
- 表达式 `a + 5` 的计算结果也是右值。

左值并不等于一定能够修改。例如 `const int a{10};` 中的 `a` 仍然是左值，但不能对它赋值。

普通非 const 左值引用不能直接绑定右值：

```cpp
int& reference{10};  // 编译错误
```

const 左值引用则可以绑定右值：

```cpp
const int& reference{10};  // 合法
```

这里会由字面量 `10` 初始化一个临时 `int` 对象，`reference` 引用的是这个临时对象。对于这种局部引用的直接初始化，临时对象的生命周期会延长到引用的生命周期结束。

对比下面几种情况：

```cpp
int a{10};

const int& b{a};
const int& c{10};
const int& d{a + 5};

a = 30;
```

最终结果为：

```text
a = 30
b = 30
c = 10
d = 15
```

其中：

- `b` 引用原变量 `a`，所以能够观察到 `a` 的变化；
- `c` 引用由字面量初始化的临时对象；
- `d` 引用表达式 `a + 5` 产生的临时结果。

虽然 `a + 5` 使用了变量 `a`，但计算结果是一个独立的临时对象。后续修改 `a` 不会重新计算这个表达式，也不会改变 `d` 所引用的值。

临时对象的生命周期延长有明确的语言规则，不能简单推广到所有引用场景，更不能因此认为“返回局部对象的引用”是安全的。

## 11. 综合练习：批量修正车辆速度

本次练习使用下面这组初始速度：

```text
0.20 0.30 0.15 0.26 0.18
```

程序需要先输出原始速度，再将每个速度增加 `0.05`。

完整代码如下：

```cpp
#include <iostream>

void addSpeed(double& speed)
{
    speed += 0.05;
}

int main()
{
    double speeds[5]{0.20, 0.30, 0.15, 0.26, 0.18};

    std::cout << "Initial speeds: ";
    for (auto original_speed : speeds)
    {
        std::cout << original_speed << ' ';
    }
    std::cout << '\n';

    std::cout << "Updated speeds: ";
    for (auto& speed : speeds)
    {
        addSpeed(speed);
        std::cout << speed << ' ';
    }
    std::cout << '\n';

    return 0;
}
```

输出结果：

```text
Initial speeds: 0.2 0.3 0.15 0.26 0.18
Updated speeds: 0.25 0.35 0.2 0.31 0.23
```

程序的关键不只是输出了正确数字，而是原数组中的元素确实被修改了。

如果更新循环写成：

```cpp
for (auto speed : speeds)
{
    addSpeed(speed);
    std::cout << speed << ' ';
}
```

当前循环中打印的数字看起来仍然正确，但 `speed` 只是元素副本，原数组保持不变。后续模块再次读取 `speeds` 时，拿到的仍然是旧数据。

在轨迹规划或控制程序中，这类问题尤其危险：当前日志可能显示“已经修正”，但真正传给后续控制器的数据并未改变。

`addSpeed()` 的返回类型使用 `void`，因为它已经通过引用修改传入对象，不需要再额外返回一个 `double`。

## 12. 本篇总结

这次学习的核心结论包括：

- `auto` 是编译期类型推导，不是运行时动态类型；
- 简单且重要的类型可以显式写出，不必为了简短而滥用 `auto`；
- 范围 `for` 必须声明循环变量；
- `auto value` 获得副本，`auto& value` 引用原对象，`const auto& value` 提供只读访问；
- 引用是对象的别名，一旦绑定就不能重新绑定；
- 引用赋值修改的是被引用对象，不是引用关系；
- 值传递适合简单数值，非 const 引用用于修改调用者对象，const 引用适合只读访问较大对象；
- 函数参数使用引用与函数返回引用是两个独立概念；
- 普通 `auto` 接收引用返回值时通常会去掉引用属性，保留引用需要使用 `auto&`；
- const 引用限制的是通过该引用进行修改，不一定意味着原对象是常量；
- const 左值引用可以绑定临时对象，但仍需认真判断对象生命周期，避免悬空引用。

车辆速度批量修正程序把 `auto`、范围 `for` 和引用参数结合到了一起，也暴露了一个很典型的错误：程序修改了循环变量的副本，却没有修改真正的数据源。

下一步将继续学习 `const`、`constexpr` 与常量表达式，进一步区分运行期变量和编译期常量。
