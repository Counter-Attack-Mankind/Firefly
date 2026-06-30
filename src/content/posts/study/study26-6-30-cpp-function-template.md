---
title: C++ 模板函数基础
published: 2026-06-30
description: 记录 C++ 模板函数的定义、基本写法、类型推导、template 关键字含义，以及可变参数模板创建对象的示例。
tags: [C++ 学习, C++, 模板函数, 泛型编程]
category: C++ 学习
draft: false
---

## 1. 模板函数的定义

模板函数（Function Template）是 C++ 提供的一种泛型编程机制。

它允许程序员只编写一份函数代码，在调用时由编译器根据不同的数据类型自动生成对应类型的函数，从而提高代码复用性，避免为 `int`、`float`、`double` 等类型重复编写相同逻辑。

简单来说就是：

```text
一份代码 + 多种数据类型都能使用
```

## 2. 基本框架

模板函数的基本格式如下：

```cpp
template <typename T>
返回类型 函数名(参数)
{
    函数体
}
```

其中 `template <typename T>` 表示定义一个模板，`T` 是一个类型参数。后面的函数可以把 `T` 当成一种类型来使用。

`typename` 也可以写成 `class`，在函数模板的类型参数场景中，两者通常没有本质区别：

```cpp
template <class T>
T maxValue(T a, T b)
{
    return a > b ? a : b;
}
```

## 3. Max 函数示例

下面用一个 `Max` 函数理解模板函数的使用方式：

```cpp
#include <iostream>
using namespace std;

template <typename T>
T Max(T a, T b)
{
    if (a > b)
        return a;
    else if (a < b)
        return b;
    else
        return a;
}

int main()
{
    cout << "hello!!,world!" << endl;

    int a = 5;
    int b = 8;
    cout << Max<int>(a, b) << endl;

    float d = 3.16f;
    float e = 5.926f;
    cout << Max<float>(d, e) << endl;

    return 0;
}
```

运行结果为：

```text
hello!!,world!
8
5.926
```

这里的 `Max<int>(a, b)` 会让编译器生成一个处理 `int` 类型的函数，`Max<float>(d, e)` 会生成一个处理 `float` 类型的函数。

## 4. 类型推导

调用模板函数时，尖括号里的类型很多时候可以省略：

```cpp
cout << Max(a, b) << endl;
cout << Max(d, e) << endl;
```

编译器会根据传入参数自动推导 `T` 的类型。

例如：

- `Max(a, b)` 中，`a` 和 `b` 都是 `int`，所以 `T` 被推导为 `int`
- `Max(d, e)` 中，`d` 和 `e` 都是 `float`，所以 `T` 被推导为 `float`

需要注意的是，如果两个参数类型不一致，编译器可能无法直接推导出唯一的 `T`：

```cpp
Max(3, 4.5); // int 和 double 混用，可能导致模板参数推导失败
```

这时可以显式指定类型：

```cpp
Max<double>(3, 4.5);
```

## 5. template 关键字

看到 `template` 关键字时，说明后面的声明与模板有关。

它不只可以修饰模板函数，也可以用于模板类、模板结构体、模板变量、模板别名等。

所以读代码时，如果看到：

```cpp
template <typename T>
```

要继续看下一行它修饰的到底是什么：

- 如果下一行是函数声明或函数定义，就是模板函数
- 如果下一行是 `class`，就是模板类
- 如果下一行是 `struct`，就是模板结构体
- 如果下一行是变量或别名声明，就是对应的变量模板或别名模板

## 6. 可变参数模板示例

模板还可以和参数包一起使用，用来接收数量不固定的参数。

下面的 `create` 函数可以根据传入的类型和参数创建对象：

```cpp
#include <iostream>
#include <string>
using namespace std;

class Student
{
public:
    Student()
    {
        cout << "default constructor" << endl;
    }

    Student(string name, int age)
        : name_(name), age_(age)
    {
        cout << "constructor with args" << endl;
    }

    void show() const
    {
        cout << "name: " << name_
             << " age: " << age_ << endl;
    }

private:
    string name_;
    int age_;
};

template <typename T, typename... Args>
T create(Args... args)
{
    cout << "creating object..." << endl;
    return T(args...);
}

int main()
{
    Student s = create<Student>("ZhangSan", 20);
    s.show();
    return 0;
}
```

这里的关键点是：

- `typename T` 表示要创建的对象类型
- `typename... Args` 表示一个类型参数包，可以接收多个参数类型
- `Args... args` 表示函数参数包，可以接收多个实际参数
- `T(args...)` 会把参数包展开，并调用 `T` 对应的构造函数

在这段代码中：

```cpp
Student s = create<Student>("ZhangSan", 20);
```

`T` 被指定为 `Student`，`args...` 对应 `"ZhangSan"` 和 `20`，所以最终会调用：

```cpp
Student("ZhangSan", 20)
```

## 7. 模板函数总结

模板函数是 C++ 泛型编程的重要特性。它允许使用类型参数编写一份通用代码，编译器会在编译阶段根据实际使用的数据类型自动生成对应的函数。

可以把它理解为：

```text
一次编写，多种类型复用
```

在实际使用中，模板函数适合处理“逻辑相同，但数据类型不同”的场景，例如比较大小、交换变量、打印容器内容、创建对象等。
