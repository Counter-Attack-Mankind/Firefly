---
title: ROS NodeHandle 句柄与命名空间用法
published: 2026-06-27
description: 记录 ros::NodeHandle 的作用、命名空间解析方式，以及在多机器人场景中创建 Publisher 和 Timer 的示例。
image: /assets/posts/ros-nodehandle-guide/image1.png
tags: [ROS 学习, ros, NodeHandle, C++]
category: ROS 学习
draft: false
---

## 1. NodeHandle 的严谨描述

`ros::NodeHandle` 是 ROS 节点与 ROS 通信系统交互的接口对象。

它负责为节点创建 `Publisher`、`Subscriber`、`Service`、`Client`、`Timer`，以及读取或设置 `Parameter` 等 ROS 资源。同时，它还维护一个命名空间，用于决定这些资源的默认名称解析位置。

创建 `NodeHandle` 时，可以指定不同类型的命名空间：

- 默认命名空间：`ros::NodeHandle nh;`
- 指定子命名空间：例如 `ros::NodeHandle nh("camera");`
- 全局命名空间：以 `/` 开头
- 私有命名空间：以 `~` 开头，其中 `~` 表示当前节点自身的私有命名空间

因此，`NodeHandle` 不仅是节点访问 ROS 系统的统一接口，也是 ROS 名称解析机制的重要组成部分。

## 2. 形象理解

可以把 ROS 看作一座大型办公楼，而 `NodeHandle` 就像节点的办事窗口，或者说是进入某个区域的门把手。

程序需要通过它向 ROS 系统申请创建 `Publisher`、`Subscriber` 等资源。同时，`NodeHandle` 还相当于告诉系统：“我现在在哪个工作区域办公”。

默认情况下，节点在当前节点所在区域办公；指定 `"camera"` 时，就进入 `camera` 这个子区域办公；指定 `"/"` 时，就直接到整栋大楼的公共区域办公；指定 `"~"` 时，则进入当前节点自己的办公室，也就是私有命名空间。

之后通过这个 `NodeHandle` 创建的 `Topic`、`Service`、`Parameter` 等资源，都会默认放到对应的工作区域中。

例如：

```cpp
ros::NodeHandle nh("robot1/navigation/perception/front_camera");
nh.subscribe("image_raw");
```

这里的 `image_raw` 会自动解析为：

```text
robot1/navigation/perception/front_camera/image_raw
```

命名空间的主要作用就是给 ROS 中的资源分类和隔离，避免重名，并方便管理。

## 3. 命名空间示例

下面这句代码可以理解为：将 `nh` 的默认命名空间设置为 `robot1/navigation/perception/front_camera`，就像进入了一个文件夹。

```cpp
ros::NodeHandle nh("robot1/navigation/perception/front_camera");
```

后续调用：

```cpp
nh.subscribe("image_raw");
```

`image_raw` 相当于该文件夹中的一个文件名，也就是资源名。ROS 会自动将两者拼接，最终访问的 Topic 为：

```text
robot1/navigation/perception/front_camera/image_raw
```

这样做既方便资源分类管理，又避免了每次都编写完整路径。

对于多机器人系统，只需将命名空间由 `robot1` 修改为 `robot2`，或者通过 launch 文件指定不同命名空间，程序中其他代码通常无需修改，就可以让同一套代码管理不同机器人的资源。

## 4. TalkerNode 示例

下面以 `talker_plus_node` 来理解 `NodeHandle` 的命名空间行为，源代码如下：

```cpp
#include <ros/ros.h>
#include <std_msgs/String.h>
#include <sstream>

class TalkerNode
{
public:
    TalkerNode(const std::string& robot_name)
        : nh_(robot_name)
    {
        pub_ = nh_.advertise<std_msgs::String>("my_topic", 10);
        timer_ = nh_.createTimer(
                    ros::Duration(1.0),
                    &TalkerNode::tick,
                    this);
    }

private:
    void tick(const ros::TimerEvent&)
    {
        std_msgs::String msg;
        std::stringstream ss;
        ss << "hello ROS " << count_;
        msg.data = ss.str();
        pub_.publish(msg);
        ROS_INFO("publish: %s", msg.data.c_str());
        count_++;
    }

private:
    ros::NodeHandle nh_;
    ros::Publisher pub_;
    ros::Timer timer_;
    int count_ = 0;
};

int main(int argc, char** argv)
{
    ros::init(argc, argv, "talker");

    TalkerNode node1("robot1");
    TalkerNode node2("robot2");
    TalkerNode node3("robot1");

    ros::spin();
    return 0;
}
```

这里 `TalkerNode` 构造函数中的：

```cpp
: nh_(robot_name)
```

表示用传入的 `robot_name` 初始化当前对象自己的 `NodeHandle`。因此：

- `node1("robot1")` 会在 `/robot1` 命名空间下创建资源
- `node2("robot2")` 会在 `/robot2` 命名空间下创建资源
- `node3("robot1")` 也会在 `/robot1` 命名空间下创建资源

而：

```cpp
pub_ = nh_.advertise<std_msgs::String>("my_topic", 10);
```

会把 `"my_topic"` 解析到对应命名空间下，所以最终会得到 `/robot1/my_topic` 和 `/robot2/my_topic` 这两个话题。

## 5. 运行输出

运行代码后的输出如下：

![TalkerNode 运行输出](/assets/posts/ros-nodehandle-guide/image1.png)

可以看到程序中创建了 3 个 `TalkerNode` 对象，因此定时器会分别触发发布逻辑。

其中 `node1` 和 `node3` 都使用 `"robot1"` 作为命名空间，所以它们都会向 `/robot1/my_topic` 发布消息；`node2` 使用 `"robot2"` 作为命名空间，所以它会向 `/robot2/my_topic` 发布消息。

## 6. 查看话题列表

输入下面的命令可以看到当前 ROS 系统中的话题：

```bash
rostopic list
```

输出中会出现对应的话题：

![rostopic list 中的话题](/assets/posts/ros-nodehandle-guide/image2.png)

此时可以看到类似下面的结果：

```text
/robot1/my_topic
/robot2/my_topic
```

这说明 `NodeHandle` 的命名空间已经生效。虽然代码里 `advertise` 的话题名都是 `"my_topic"`，但由于不同对象使用了不同的 `NodeHandle` 命名空间，ROS 会自动解析出不同的完整 Topic 名称。

## 7. 常见 NodeHandle 命名空间写法

下面是几种常见写法：

```cpp
ros::init(argc, argv, "node_name"); // node name

ros::NodeHandle n;               // n 命名空间为 /node_namespace
ros::NodeHandle n1("sub");       // n1 命名空间为 /node_namespace/sub
ros::NodeHandle n2(n1, "sub2");  // n2 命名空间为 /node_namespace/sub/sub2

ros::NodeHandle pn1("~");        // pn1 命名空间为 /node_namespace/node_name
ros::NodeHandle pn2("~sub");     // pn2 命名空间为 /node_namespace/node_name/sub
ros::NodeHandle pn3("~/sub");    // pn3 命名空间为 /node_namespace/node_name/sub
```

简单来说：

- 普通 `NodeHandle` 适合创建对外公开的 Topic、Service 等资源
- 私有 `NodeHandle` 适合读取当前节点自己的参数，例如 `~rate`、`~frame_id`
- 多机器人或多模块系统中，可以通过命名空间隔离同名资源，让同一套代码复用在不同机器人或模块上
