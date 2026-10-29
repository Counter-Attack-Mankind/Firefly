---
title: C++ 学习笔记 00：Windows 开发环境搭建
published: 2026-10-29
description: 记录在 Windows 中使用 MSYS2 UCRT64 安装 GCC/G++、GDB 和 Make，配置 Path 与 VS Code IntelliSense，并编译运行第一个 C++17 程序的完整过程。
tags: [C++ 学习, C++, MSYS2, VS Code, GCC]
category: C++ 学习
draft: false
---

## 1. 先认识这套开发环境

在 Windows 中学习 C++，只安装 VS Code 还不够。VS Code 是代码编辑器，本身不包含 C++ 编译器和调试器，因此还需要准备一套能够完成编译、链接和调试的工具链。

这次使用的组合是：

```text
VS Code + MSYS2 + UCRT64 + GCC/G++ + GDB
```

它们各自负责的工作如下：

| 工具 | 主要作用 |
| --- | --- |
| VS Code | 编辑代码，并通过扩展提供 IntelliSense、代码导航和调试界面 |
| MSYS2 | 提供终端环境和 `pacman` 软件包管理器 |
| UCRT64 | MSYS2 中面向 64 位 Windows、基于 UCRT 的 GCC 工具链环境 |
| GCC | GNU 编译器集合，支持 C、C++ 等多种语言 |
| `gcc` | 通常用于编译 C 程序 |
| `g++` | 用于编译和链接 C++ 程序 |
| GDB | GNU 调试器，可用于断点、单步执行和变量检查 |
| Make | 根据构建规则组织编译过程 |

需要特别区分两个概念：

- MSYS2 不是 C++ 编译器，而是安装和管理开发工具的平台；
- MinGW-w64 为 GCC 生成 Windows 原生程序提供基础支持，UCRT64 则是 MSYS2 提供的一种具体工具链环境。

如果不确定该选择哪个环境，MSYS2 官方目前推荐优先使用 UCRT64。

## 2. 安装 MSYS2

从 [MSYS2 官网](https://www.msys2.org/) 下载适用于 64 位 Windows 的安装程序。

本机将 MSYS2 安装在：

```text
E:\Development\msys64
```

这样 GCC、GDB 等工具也会保存在 E 盘。安装完成后，从开始菜单打开 **MSYS2 UCRT64**，注意不要误开成普通的 MSYS 终端。

终端提示符中应当能够看到 `UCRT64`，例如：

```text
15832@Lacia UCRT64 ~
$
```

也可以检查 MSYS2 根目录对应的 Windows 路径：

```bash
cygpath -w /
```

本机预期输出：

```text
E:\Development\msys64
```

## 3. 配置镜像并更新系统

如果官方软件源下载速度正常，可以直接跳过镜像配置。需要使用清华镜像时，在 UCRT64 终端执行：

```bash
sed -i "s#https\?://mirror.msys2.org/#https://mirrors.tuna.tsinghua.edu.cn/msys2/#g" /etc/pacman.d/mirrorlist*
```

然后更新软件包数据库和已安装的软件包：

```bash
pacman -Syu
```

参数含义：

- `-S`：执行同步软件包操作；
- `-y`：刷新软件包数据库；
- `-u`：升级已安装的软件包。

如果更新过程中提示关闭终端，就重新打开 **MSYS2 UCRT64**，再次执行 `pacman -Syu`，直到更新完成。

本次更新最终显示：

```text
:: Starting core system upgrade...
 there is nothing to do
:: Starting full system upgrade...
 there is nothing to do
```

这表示当时已经没有需要继续升级的软件包。

## 4. 安装 GCC/G++、GDB 和 Make

在 UCRT64 终端执行：

```bash
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-gdb mingw-w64-ucrt-x86_64-make
```

其中 `--needed` 表示已经安装且版本符合要求的软件包不再重复安装。

| 软件包 | 作用 |
| --- | --- |
| `mingw-w64-ucrt-x86_64-gcc` | 安装 GCC 和 G++ |
| `mingw-w64-ucrt-x86_64-gdb` | 安装 GDB 调试器 |
| `mingw-w64-ucrt-x86_64-make` | 安装适用于 Windows 的 MinGW Make |

安装完成后进行验证：

```bash
g++ --version
gdb --version
mingw32-make --version
which g++
```

本机安装结果包括：

```text
g++.exe (Rev6, Built by MSYS2 project) 16.2.0
GNU gdb (GDB) 18.1
/ucrt64/bin/g++
```

这说明 G++ 和 GDB 已经安装成功。由于安装的是 MinGW Make，在 Windows 环境中对应的可执行命令是 `mingw32-make`。

本机的 G++ 实际位置为：

```text
E:\Development\msys64\ucrt64\bin\g++.exe
```

## 5. 将 G++ 加入 Windows Path

虽然现在可以在 UCRT64 终端中使用 G++，但 Windows PowerShell 和 VS Code 内置终端还不一定能够找到 `g++.exe`。

Windows 会在 Path 环境变量记录的目录中搜索可执行程序。将 UCRT64 的 `bin` 目录加入用户 Path 后，就可以在任意工作目录直接执行 `g++`。

打开 Windows PowerShell，执行：

```powershell
$gccPath = "E:\Development\msys64\ucrt64\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

if (($userPath -split ';') -notcontains $gccPath) {
    $newUserPath = if ([string]::IsNullOrWhiteSpace($userPath)) {
        $gccPath
    } else {
        $userPath.TrimEnd(';') + ";" + $gccPath
    }

    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
}
```

这段命令只修改当前用户的 Path，并且会避免重复添加同一路径。

已经打开的 PowerShell 或 VS Code 不会自动读取新的环境变量。最简单的做法是关闭终端后重新打开；也可以在当前 PowerShell 会话中临时刷新：

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
```

随后验证：

```powershell
g++ --version
where.exe g++
```

本机输出的编译器路径为：

```text
E:\Development\msys64\ucrt64\bin\g++.exe
```

至此，Windows 已经能够直接调用 G++。

## 6. 配置 VS Code 的 C++ 开发体验

### 6.1 安装 C/C++ 扩展

在 VS Code 中按 `Ctrl + Shift + X` 打开扩展页面，搜索并安装微软官方的 **C/C++** 扩展：

```text
ms-vscode.cpptools
```

这个扩展主要提供 IntelliSense、代码导航、错误提示和调试集成，并不会附带 GCC/G++ 编译器。

### 6.2 配置 IntelliSense

用 VS Code 打开本次学习目录：

```text
D:\desktop\cpp
```

按 `Ctrl + Shift + P` 打开命令面板，搜索：

```text
C/C++: Edit Configurations (JSON)
```

然后编辑生成的 `.vscode/c_cpp_properties.json`：

```json
{
    "configurations": [
        {
            "name": "Win32",
            "compilerPath": "E:/Development/msys64/ucrt64/bin/g++.exe",
            "intelliSenseMode": "windows-gcc-x64",
            "includePath": [
                "${workspaceFolder}/**"
            ],
            "defines": [
                "_DEBUG",
                "UNICODE",
                "_UNICODE"
            ],
            "cppStandard": "c++17",
            "cStandard": "c17"
        }
    ],
    "version": 4
}
```

主要配置项如下：

| 配置项 | 作用 |
| --- | --- |
| `compilerPath` | 指定实际使用的 G++ 编译器 |
| `intelliSenseMode` | 选择与 Windows GCC x64 匹配的代码分析模式 |
| `includePath` | 添加项目自己的头文件搜索目录 |
| `cppStandard` | 按 C++17 语法分析代码 |
| `cStandard` | 按 C17 语法分析 C 代码 |

如果此前出现：

```text
#include errors detected.
Please update your includePath.
```

通常是 C/C++ 扩展没有找到正确的编译器或标准库头文件。设置 `compilerPath` 后，扩展会向 G++ 查询系统头文件路径，一般不需要手动把标准库目录全部写进 `includePath`。

需要注意：`c_cpp_properties.json` 负责的是 IntelliSense 配置，不会替你真正编译程序。实际构建仍然要调用 G++，或者另行配置 `tasks.json`、Make、CMake 等构建方式。

### 6.3 让 VS Code 终端识别 G++

如果外部 PowerShell 已经可以使用 `g++`，但 VS Code 内置终端仍然提示找不到命令，通常是因为 VS Code 还保留着旧的环境变量。

完全退出 VS Code 后重新打开即可。也可以只在当前 VS Code PowerShell 终端临时执行：

```powershell
$env:Path += ";E:\Development\msys64\ucrt64\bin"
```

然后再次测试：

```powershell
g++ --version
```

这种写法只对当前终端进程生效，不会永久修改用户 Path。

## 7. 编译并运行第一个 C++ 程序

本次项目结构如下：

```text
D:\desktop\cpp
└── day01
    └── 1.cpp
```

在 `1.cpp` 中编写：

```cpp
#include <iostream>

int main()
{
    std::cout << "Hello, C++!" << std::endl;
    return 0;
}
```

在 VS Code 的 PowerShell 终端进入源文件目录：

```powershell
cd D:\desktop\cpp\day01
```

执行编译：

```powershell
g++ -std=c++17 -Wall -Wextra 1.cpp -o 1.exe
```

各参数的含义如下：

| 参数 | 作用 |
| --- | --- |
| `g++` | 调用 C++ 编译器驱动程序 |
| `-std=c++17` | 按 C++17 标准编译 |
| `-Wall` | 开启一组常用警告 |
| `-Wextra` | 开启更多有价值的警告 |
| `1.cpp` | 指定要编译的源文件 |
| `-o 1.exe` | 指定输出的可执行文件名 |

如果编译成功，G++ 通常不会输出信息，而是在当前目录生成 `1.exe`。

在 PowerShell 中运行：

```powershell
.\1.exe
```

预期输出：

```text
Hello, C++!
```

其中 `.\` 表示当前目录。

## 8. 编译和运行不是同一件事

编译是把 `.cpp` 源代码转换并链接为 `.exe` 可执行文件；运行则是让操作系统加载并执行已经生成的程序。

如果修改了 `1.cpp`，却没有重新执行编译命令，那么再次运行原来的 `1.exe` 时，看到的仍然是旧程序的结果。

因此每次修改源代码后，都要重新编译：

```powershell
g++ -std=c++17 -Wall -Wextra 1.cpp -o 1.exe
```

编译成功后再运行新的 `1.exe`。

## 9. 常见问题速查

### PowerShell 提示找不到 `g++`

先执行：

```powershell
where.exe g++
```

如果没有结果，检查 `E:\Development\msys64\ucrt64\bin` 是否已经加入用户 Path，并重新打开终端或 VS Code。

### VS Code 仍然提示 `iostream` 不存在

确认 `c_cpp_properties.json` 中的 `compilerPath` 指向真实存在的 `g++.exe`，然后在命令面板中运行：

```text
C/C++: Select IntelliSense Configuration
```

选择 UCRT64 中的 G++。

### 修改代码后，输出没有变化

很可能只重新运行了旧的 `.exe`，却没有重新编译 `.cpp`。先执行 G++ 编译命令，再运行生成的程序。

### `make` 命令找不到

本文安装的是 MinGW Make，对应命令为：

```powershell
mingw32-make --version
```

它与 MSYS 环境中的 `/usr/bin/make` 不是同一个可执行文件。

## 10. 最终环境总结

| 项目 | 本机配置 |
| --- | --- |
| 操作系统 | Windows |
| 代码编辑器 | VS Code |
| 软件包管理环境 | MSYS2 |
| 编译工具链环境 | UCRT64 |
| 编译器 | GCC/G++ 16.2.0 |
| 调试器 | GDB 18.1 |
| C++ 标准 | C++17 |
| 工具安装目录 | `E:\Development\msys64` |
| G++ 路径 | `E:\Development\msys64\ucrt64\bin\g++.exe` |
| 学习项目目录 | `D:\desktop\cpp` |

最后可以把这次环境搭建记成下面几句话：

- VS Code 是编辑器，本身不包含 GCC/G++；
- MSYS2 是开发环境和软件包管理平台，不是编译器；
- UCRT64 是本次使用的 64 位 Windows GCC 工具链环境；
- GCC 是编译器集合，G++ 用于编译和链接 C++ 程序；
- Path 让 Windows 终端能够找到 `g++.exe`；
- `c_cpp_properties.json` 负责 IntelliSense，不等于实际编译配置；
- `.cpp` 是源文件，`.exe` 是编译和链接生成的可执行程序；
- 修改源代码后必须重新编译，新的内容才会反映到可执行文件中。

至此，Windows 下的 C++17 开发环境已经安装并配置完成，可以开始后续的语法学习。

## 参考资料

- [MSYS2：Getting Started](https://www.msys2.org/)
- [MSYS2：Environments](https://www.msys2.org/docs/environments/)
- [清华大学开源软件镜像站：MSYS2 使用帮助](https://mirrors.tuna.tsinghua.edu.cn/help/msys2/)
- [Visual Studio Code：Using GCC with MinGW](https://code.visualstudio.com/docs/cpp/config-mingw)
