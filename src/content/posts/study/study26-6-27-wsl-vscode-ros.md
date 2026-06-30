---
title: WSL 与 VS Code 配合开发 ROS 指南
published: 2026-06-27
description: 在 WSL 中创建 ROS catkin 工作空间，并用 VS Code 配置 C/C++ IntelliSense 与 CMakeLists.txt 的简明流程。
image: /assets/posts/wsl-vscode-ros-guide/image1.png
tags: [ROS 学习, ros, WSL, VS Code]
category: ROS 学习
draft: false
---

## 1. 在 WSL 中创建工作空间

在 WSL 终端中执行下面的命令，创建并初始化 catkin 工作空间：

```bash
cd ~
mkdir -p catkin_ws/src
cd catkin_ws
catkin_make
```

然后加载环境。也可以将加载命令写入 `~/.bashrc`，避免之后重复设置环境：

```bash
source devel/setup.bash
echo "source ~/catkin_ws/devel/setup.bash" >> ~/.bashrc
```

## 2. 创建 ROS 功能包

进入工作空间的 `src` 目录，创建功能包：

```bash
cd ~/catkin_ws/src
catkin_create_pkg cpp_pubsub roscpp std_msgs
```

其中 `cpp_pubsub` 是功能包名称，`roscpp` 和 `std_msgs` 是功能包依赖项。

![创建 ROS 功能包后的目录结构](/assets/posts/wsl-vscode-ros-guide/image1.png)

继续进入功能包目录，并创建源码目录：

```bash
cd ~/catkin_ws/src/cpp_pubsub
mkdir -p src
```

## 3. 用 VS Code 打开工作空间并生成配置文件

回到 catkin 工作空间根目录，再打开 VS Code：

```bash
cd ~/catkin_ws
code .
```

必须在当前工作空间根目录下打开 VS Code，而不是只打开某个功能包。

![在工作空间根目录打开 VS Code](/assets/posts/wsl-vscode-ros-guide/image2.png)

在 VS Code 中按 `Ctrl+Shift+P`，选择：

```text
C/C++: Edit Configurations (JSON)
```

此时会生成 `.vscode/c_cpp_properties.json`。可以将其改为下面这样：

```json
{
    "configurations": [
        {
            "name": "ROS-Noetic",
            "includePath": [
                "${workspaceFolder}/src/**",
                "/opt/ros/noetic/include",
                "/usr/include/**"
            ],
            "defines": [],
            "compilerPath": "/usr/bin/g++",
            "cStandard": "c17",
            "cppStandard": "gnu++14",
            "intelliSenseMode": "linux-gcc-x64"
        }
    ],
    "version": 4
}
```

## 4. 创建 C++ 文件

原文档此处保留了“创建 cpp 文件”的步骤标题，具体代码内容可后续继续补充到 `src/talker.cpp`。

## 5. 修改 CMakeLists.txt

在 `CMakeLists.txt` 中添加可执行文件：

```cmake
add_executable(talker_node src/talker.cpp)
```

这里的含义是生成一个名为 `talker_node` 的可执行文件，源文件路径为 `src/talker.cpp`。

因此运行时使用的是：

```bash
rosrun cpp_subpub talker_node
```

而不是直接运行 `talker.cpp`。

继续添加链接库配置：

```cmake
target_link_libraries(talker_node
  ${catkin_LIBRARIES}
)
```

这一步会把 `talker_node` 和 ROS 需要的库链接起来。接下来重新编译即可：

```bash
cd ~/catkin_ws
catkin_make
```

![修改 CMakeLists.txt 后重新编译](/assets/posts/wsl-vscode-ros-guide/image3.png)
