---
title: C++ 学习笔记 04：指针、nullptr 与安全访问
published: 2026-11-02
description: 记录 C++ 指针的声明与解引用、nullptr、指针和引用的区别、const 指针组合、对象生命周期、悬空指针、数组退化及边界检查。
tags: [C++ 学习, C++, 指针, nullptr, const]
category: C++ 学习
draft: false
---

## 1. 指针保存对象的地址

指针（Pointer）是用于保存地址的变量。假设已经定义一个速度变量：

```cpp
double speed{0.25};
```

可以使用取地址运算符 `&` 获得它的地址，再用指针保存：

```cpp
double* pointer{&speed};
```

这里：

- `&speed` 表示获取 `speed` 的地址；
- `pointer` 保存这个地址；
- `*pointer` 表示解引用，通过地址访问 `speed` 对象。

通过指针修改对象：

```cpp
*pointer = 0.20;
```

执行后，`speed` 的值也变成 `0.20`。

### pointer 与 &pointer

指针变量本身与它指向的对象是两个不同实体：

```cpp
std::cout << pointer << '\n';   // speed 的地址
std::cout << &pointer << '\n';  // 指针变量自身的地址
```

`pointer` 保存的是 `speed` 的地址，而 `&pointer` 是指针变量本身在内存中的地址。

### 声明中的 * 与表达式中的 *

同一个符号在不同位置有不同含义：

```cpp
double* pointer{&speed};  // 声明一个 double 指针
*pointer = 0.30;          // 解引用并修改所指对象
```

阅读时要结合上下文判断：声明中的 `*` 表示指针类型，表达式中的 `*` 表示解引用。

## 2. 改变指向与修改对象

下面两条语句看起来相似，但作用完全不同：

```cpp
pointer = &speed2;
*pointer = 0.30;
```

- `pointer = &speed2`：改变指针保存的地址，让它改为指向 `speed2`；
- `*pointer = 0.30`：不改变指向，而是修改当前所指对象的值。

完整示例：

```cpp
double speed1{0.20};
double speed2{0.40};

double* pointer{&speed1};
*pointer = 0.25;  // speed1 = 0.25

pointer = &speed2;
*pointer = 0.30;  // speed2 = 0.30
```

指针可以在其生命周期内重新指向类型兼容的其他对象。

## 3. 使用 nullptr 表示空指针

当指针暂时没有合适的对象可以指向时，应当使用 `nullptr` 初始化：

```cpp
double* pointer{nullptr};
```

访问指针前可以先判断：

```cpp
if (pointer != nullptr)
{
    std::cout << *pointer << '\n';
}
```

也可以利用指针的条件转换简写为：

```cpp
if (pointer)
{
    std::cout << *pointer << '\n';
}
```

`nullptr` 是 C++11 引入的空指针字面量，类型为 `std::nullptr_t`。与 `0` 或实现相关的 `NULL` 宏相比，它能够明确表达空指针语义。

### nullptr 与函数重载

假设存在两个重载函数：

```cpp
void check(int value);
void check(double* pointer);
```

调用：

```cpp
check(0);
```

会匹配整数版本；而：

```cpp
check(nullptr);
```

会匹配指针版本。这正是现代 C++ 推荐使用 `nullptr` 的重要原因之一。

### 空指针不能解引用

下面的操作属于未定义行为：

```cpp
double* pointer{nullptr};
std::cout << *pointer << '\n';
```

未定义行为不等于一定出现编译错误，也不保证运行时必然崩溃。程序可能崩溃，也可能暂时表现正常，或者产生其他不可预测的结果。

## 4. 未初始化指针不是空指针

下面的局部指针没有初始化：

```cpp
double* pointer;
```

它不会自动变成 `nullptr`。在 C++17 中，读取或使用这种不确定的指针值会导致未定义行为。

因此，不要依赖下面这样的判断来补救未初始化指针：

```cpp
double* pointer;

if (pointer != nullptr)  // pointer 本身尚未初始化
{
    std::cout << *pointer << '\n';
}
```

正确做法是在定义时就提供初始值：

```cpp
double* pointer{nullptr};
```

或者立即绑定有效对象：

```cpp
double speed{0.25};
double* pointer{&speed};
```

## 5. 指针与引用的区别

指针和引用都能间接操作已有对象，但语言语义不同：

```cpp
double speed1{0.20};
double speed2{0.40};

double* pointer{&speed1};
double& reference{speed1};

pointer = &speed2;
reference = speed2;
```

执行后：

- `pointer` 改为指向 `speed2`；
- `reference` 仍然绑定 `speed1`；
- `reference = speed2` 只是把 `speed2` 的值赋给 `speed1`。

| 特性 | 指针 | 引用 |
| --- | --- | --- |
| 初始化时是否必须绑定对象 | 不必须，可以是 `nullptr` | 必须 |
| 能否改为指向其他对象 | 可以 | 不能重新绑定 |
| 能否表示缺少对象 | 可以使用 `nullptr` | 正常有效引用不可以 |
| 访问对象 | 需要解引用 | 像普通变量一样使用 |

引用是已有对象的别名，不应简单理解为“地址被锁定的指针”。

### 函数接口中的选择

如果函数必须接收有效对象并修改它，可以使用引用：

```cpp
void updateSpeed(double& speed);
```

如果允许调用者不提供对象，可以使用指针，并用 `nullptr` 表示缺失：

```cpp
bool updateSpeed(double* speed);
```

只需要读取时，对于 `double` 这样的简单类型通常可以值传递；对于较大的对象，可以使用 const 引用。

这两个函数还可以构成重载：

```cpp
void updateSpeed(double& speed);
void updateSpeed(double* speed);
```

调用 `updateSpeed(value)` 会匹配引用版本，调用 `updateSpeed(&value)` 或 `updateSpeed(nullptr)` 会匹配指针版本。C++ 的函数重载要求形参列表存在可区分的差异，仅靠返回类型不同不能构成重载。

## 6. const 与指针的四种组合

`const` 可以约束通过指针对对象的修改，也可以约束指针变量本身。它相对于 `*` 的位置决定了具体含义。

| 声明形式 | 能否通过指针修改对象 | 能否重新指向 |
| --- | --- | --- |
| `double* pointer` | 可以 | 可以 |
| `const double* pointer` | 不可以 | 可以 |
| `double* const pointer` | 可以 | 不可以 |
| `const double* const pointer` | 不可以 | 不可以 |

### 指向 const 数据的指针

```cpp
double speed{0.20};
const double* pointer{&speed};

speed = 0.30;   // 合法
// *pointer = 0.40;  // 编译错误
```

`const double*` 表示不能通过 `pointer` 修改对象，但指针本身可以重新指向其他兼容对象。

如果原对象不是 const，仍然可以通过变量名或其他非 const 访问途径修改它。这里限制的是访问权限，不是把对象的当前数值永久锁定。

### 常量指针

```cpp
double speed{0.20};
double* const pointer{&speed};

*pointer = 0.30;  // 合法
// pointer = &other;  // 编译错误
```

`double* const` 表示指针保存的地址不能改变，但仍可通过它修改对象。因为指针本身是 const，所以声明时必须初始化。

### 指向 const 数据的常量指针

```cpp
double speed{0.20};
const double* const pointer{&speed};
```

此时既不能重新指向，也不能通过该指针修改对象。不过，如果原对象本身不是 const，仍可通过其他合法途径修改它。

可以用下面的方式辅助记忆：

```text
const 在 * 左边：限制通过指针修改数据
const 在 * 右边：限制指针自身重新赋值
两边都有 const：同时施加两种限制
```

## 7. 作用域、生命周期与悬空指针

一对花括号可以单独构成复合语句，并建立局部作用域：

```cpp
int a{10};

{
    int b{20};
    a = b;
}

// a 仍然有效，值为 20
// b 已经超出作用域
```

内层作用域结束后，其中具有自动存储期的局部对象生命周期结束。外层变量不会因此被销毁，已经复制到外层对象中的值也不会消失。

如果指针保存了局部对象的地址，而对象的生命周期已经结束，指针就会悬空：

```cpp
double* pointer{nullptr};

{
    double speed{0.25};
    pointer = &speed;
}

// pointer 已经悬空，不能解引用
```

指针不会因为所指对象被销毁而自动变成 `nullptr`。

### 三种无效或危险状态

- **空指针**：明确为 `nullptr`，可以安全判空，但不能解引用；
- **未初始化指针**：尚未得到确定的指针值，不能读取、判空或解引用；
- **悬空指针**：曾经指向有效对象，但对象生命周期已经结束。

“野指针”是非正式称呼，通常泛指指向不确定或无效位置的指针，有些资料也会将悬空指针包括在内。

最重要的是：

```text
pointer != nullptr
```

只能说明它不是空指针，不能证明所指对象仍然存活。安全访问还必须考虑对象生命周期。

## 8. 指针与数组

C++ 原生数组的元素连续存储：

```cpp
double speeds[5]{0.20, 0.22, 0.25, 0.23, 0.18};
double* pointer{speeds};
```

在大多数表达式中，数组会转换为指向首元素的指针，这称为数组到指针转换，也常被称为数组退化。

以下三种写法访问同一个元素：

```cpp
speeds[2];
pointer[2];
*(pointer + 2);
```

`pointer + 1` 表示移动到下一个 `double` 元素，而不是简单地把地址增加一个字节。实际跨过的字节数由所指类型决定。

需要注意：数组本身并不是指针。在数组定义所在的作用域中，数组类型仍包含元素数量信息。

## 9. 数组形参会退化为指针

函数参数写成：

```cpp
void process(double data[], int size);
```

其中的 `double data[]` 会被调整为：

```cpp
double* data
```

函数接收到的是指针，不会自动获得原数组长度，因此需要额外传递 `size`。

不能在函数内部通过下面的写法得到原数组长度：

```cpp
sizeof(data) / sizeof(data[0])
```

因为此时 `data` 已经是指针，`sizeof(data)` 得到的是指针本身的大小。

传入长度也不等于自动获得边界保护。函数仍然需要主动检查每次访问是否合法，并依赖调用者保证长度参数没有超过实际可访问范围。

## 10. 数组边界检查

对于长度为 `size` 的数组，合法下标范围为：

```text
0 <= index < size
```

完整的检查可以写成：

```cpp
if (data == nullptr || size <= 0 ||
    index < 0 || index >= size)
{
    return false;
}
```

这里必须使用 `index >= size`，不能写成 `index > size`。长度为 5 的数组只有 `0` 到 `4` 五个合法下标，`data[5]` 已经越界。

数组越界访问属于未定义行为，不保证编译器一定报告错误，也不保证程序立即崩溃。

指针可以合法形成指向数组末元素之后位置的尾后指针：

```cpp
double* end{speeds + 5};
```

这个指针常用于表示遍历终点，可以参与比较或作为范围边界，但不能解引用。

## 11. 综合练习：安全修改车辆速度

下面的函数集中处理指针判空、长度检查、下标检查和速度限幅：

```cpp
#include <iomanip>
#include <iostream>
#include <iterator>

bool setSpeed(
    double* speeds,
    int size,
    int index,
    double new_speed,
    double max_speed
)
{
    if (speeds == nullptr || size <= 0)
    {
        return false;
    }

    if (index < 0 || index >= size)
    {
        return false;
    }

    if (new_speed < 0.0)
    {
        return false;
    }

    if (new_speed > max_speed)
    {
        new_speed = max_speed;
    }

    speeds[index] = new_speed;
    return true;
}

void printSpeeds(const double* speeds, int size)
{
    if (speeds == nullptr || size <= 0)
    {
        return;
    }

    for (int i{0}; i < size; ++i)
    {
        std::cout << speeds[i] << ' ';
    }
    std::cout << '\n';
}

int main()
{
    constexpr double max_speed{0.26};
    double speeds[]{0.20, 0.22, 0.25, 0.23, 0.18};
    const int size{
        static_cast<int>(std::size(speeds))
    };

    const bool updated{
        setSpeed(speeds, size, 2, 0.40, max_speed)
    };

    if (!updated)
    {
        std::cerr << "Failed to update speed.\n";
        return 1;
    }

    std::cout << std::fixed << std::setprecision(2);
    printSpeeds(speeds, size);

    return 0;
}
```

输出结果：

```text
0.20 0.22 0.26 0.23 0.18
```

传入的新速度是 `0.40`，超过最大速度 `0.26`，因此函数将其限制为 `0.26` 后写入第三个元素。

这个例子体现了几条重要的接口约定：

- 指针参数允许传入 `nullptr`，函数必须明确处理；
- 长度与下标必须同时检查；
- `size` 由调用者提供，调用者仍需保证它不超过实际数组范围；
- `const double*` 表示打印函数只读取数据；
- 返回的 `bool` 必须由调用者接收或检查，才能知道修改是否成功。

在更现代的 C++ 接口中，可以优先使用 `std::array`、`std::vector`，或在支持 C++20 时使用 `std::span`，减少裸指针和独立长度参数不一致的风险。不过理解原生指针和数组退化，仍然是阅读底层代码、C 接口及现有 ROS/C++ 工程的基础。

## 12. 本篇总结

这次学习的核心结论包括：

- 指针变量保存对象地址，`*pointer` 用于访问所指对象；
- `pointer = &object` 改变指向，`*pointer = value` 修改对象；
- 没有合适对象时应使用 `nullptr` 初始化指针；
- 未初始化指针不会自动成为空指针；
- 指针可以重新指向并表示缺失对象，引用必须绑定有效对象且不能重新绑定；
- `const double*` 限制通过指针修改数据，`double* const` 限制指针自身重新赋值；
- 非空指针不一定有效，还必须考虑所指对象的生命周期；
- 局部对象生命周期结束后，保存其地址的指针会悬空；
- 原生数组在大多数表达式和函数参数中会转换为首元素指针；
- 数组形参不保留长度信息，边界检查必须由接口和代码主动完成；
- 空指针解引用、悬空指针解引用和数组越界都属于未定义行为。

指针安全不能只靠一次 `nullptr` 判断。真正可靠的访问还需要同时满足：指针已经初始化、当前不为空、所指对象仍然存活，并且数组下标位于接口允许的范围内。
