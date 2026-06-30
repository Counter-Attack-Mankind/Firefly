---
title: C++ 引用学习笔记：引用参数、输出参数、const 引用参数、返回引用
published: 2026-06-30
description: 通过 swap、print、compare 和 Max 示例，记录 C++ 引用参数、输出参数、const 引用参数以及返回引用的基本用法。
tags: [C++ 学习, C++, 引用, 引用参数]
category: C++ 学习
draft: false
---

## 1. 引用的基本理解

C++ 中的引用可以理解为变量的另一个名字。

定义引用时必须初始化，并且初始化之后不能再改为引用其他变量：

```cpp
int x = 10;
int& ref = x;
```

这里 `ref` 不是一个新的独立变量，而是 `x` 的别名。修改 `ref` 就等于修改 `x`。

引用常用于函数参数和函数返回值中，可以让函数直接操作外部变量。

## 2. 普通参数：值传递不会修改原变量

先看普通参数版本的交换函数：

```cpp
void swap1(int a, int b)
{
    int temp = a;
    a = b;
    b = temp;
}
```

调用时：

```cpp
int x = 10;
int y = 20;

swap1(x, y);
```

`swap1` 中的 `a` 和 `b` 只是 `x` 和 `y` 的副本。

因此函数内部虽然交换了 `a` 和 `b`，但外部的 `x` 和 `y` 不会发生变化。

运行结果仍然是：

```text
x = 10
y = 20
```

这就是值传递的特点：函数拿到的是一份拷贝。

## 3. 引用参数：函数可以修改原变量

如果希望函数内部真正修改外部变量，可以使用引用参数：

```cpp
void swap2(int& a, int& b)
{
    int temp = a;
    a = b;
    b = temp;
}
```

这里的 `int& a` 和 `int& b` 表示 `a`、`b` 是外部实参的引用。

调用时：

```cpp
int x = 10;
int y = 20;

swap2(x, y);
```

此时 `a` 就是 `x` 的别名，`b` 就是 `y` 的别名。函数内部修改 `a` 和 `b`，等价于直接修改 `x` 和 `y`。

所以交换后结果为：

```text
x = 20
y = 10
```

简单来说：

- 普通参数：传入变量的值
- 引用参数：传入变量本身

## 4. const 引用参数：避免拷贝并防止修改

下面的 `print` 函数使用了 `const string&`：

```cpp
void print(const string& str)
{
    cout << "string content: " << str << endl;
}
```

这里有两个重点：

- `string&` 表示用引用接收参数，避免复制整个字符串
- `const` 表示函数内部不能修改这个字符串

也就是说，`const string& str` 既提高效率，又保证安全。

如果函数只是读取参数，不需要修改参数，通常推荐使用 `const 引用`：

```cpp
void print(const string& str);
```

特别是 `string`、对象、容器等比较大的类型，使用 `const 引用` 可以避免不必要的拷贝。

## 5. 输出参数：用引用带回多个结果

函数只能直接 `return` 一个值。如果想让函数计算出多个结果，可以使用引用参数作为输出参数。

例如：

```cpp
void compare(int a, int b, int& maxValue, int& minValue)
{
    if (a > b)
    {
        maxValue = a;
        minValue = b;
    }
    else
    {
        maxValue = b;
        minValue = a;
    }
}
```

调用时：

```cpp
int maxNum;
int minNum;

compare(35, 12, maxNum, minNum);
```

在这个函数中：

- `a` 和 `b` 是输入参数
- `maxValue` 和 `minValue` 是输出参数

因为 `maxValue` 引用的是 `maxNum`，`minValue` 引用的是 `minNum`，所以函数内部赋值后，外部变量也会得到结果。

运行后：

```text
max: 35
min: 12
```

这种写法常用于一个函数需要带回多个结果的场景。

## 6. 返回引用：函数返回变量本身

普通函数返回值时，通常返回的是一个值。

如果函数返回引用，返回的就是某个变量本身：

```cpp
int& Max(int& a, int& b)
{
    if (a > b)
        return a;
    else
        return b;
}
```

这里 `Max` 的返回类型是 `int&`，表示返回的是 `a` 或 `b` 的引用。

调用时：

```cpp
int a = 5;
int b = 8;

Max(a, b) = 100;
```

因为 `b` 比 `a` 大，所以 `Max(a, b)` 返回的是 `b` 的引用。

于是这句代码：

```cpp
Max(a, b) = 100;
```

就等价于：

```cpp
b = 100;
```

最终输出为：

```text
a = 5
b = 100
```

这说明返回引用的函数结果可以作为左值使用。

## 7. 返回引用时的注意事项

返回引用虽然很灵活，但一定要注意生命周期。

不要返回局部变量的引用：

```cpp
int& bad()
{
    int x = 10;
    return x; // 错误：x 在函数结束后会被销毁
}
```

函数结束后，局部变量 `x` 已经不存在了。此时返回它的引用，会产生悬空引用。

比较安全的情况是返回参数的引用，或者返回生命周期足够长的对象引用：

```cpp
int& Max(int& a, int& b)
{
    return a > b ? a : b;
}
```

这里返回的是调用者传入的变量引用，只要外部变量还存在，返回引用就是有效的。

## 8. 总结

引用是 C++ 中非常重要的语法，它可以让函数直接操作外部变量。

常见用法可以这样记：

- `int& a`：引用参数，函数可以修改实参
- `const string& str`：只读引用参数，避免拷贝并防止修改
- `int& maxValue`：输出参数，通过引用把结果带回去
- `int& Max(...)`：返回引用，返回变量本身，可以作为左值

一句话理解：

```text
引用不是复制一份数据，而是给原变量起了一个新名字。
```
