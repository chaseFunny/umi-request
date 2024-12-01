# umi-request 源码学习笔记

## 初步了解

一个基于 fetch 的请求库，核心就是请求库，但是提供了很多配置和能力

这个库导出了一个 request 函数，可以用来发送请求，返回一个 promise 对象

还导出一个 extend 函数，可以用来配置请求

## 源码阅读

1）看 README 了解核心 API 使用方法和功能介绍

2）看 package.json 了解库的依赖和脚本命令
qs：处理 query 参数
isomorphic-fetch：fetch 的 polyfill，支持 node 和浏览器

3）看 src/index.ts 了解库的实现

1、默认导出 request 函数，还导出了 extend, RequestError, ResponseError, Onion, fetch

### request 函数逻辑

是 src/request.ts 文件默认导出的函数，进入这个文件，这个函数默认导出的是里面定义的 request 函数的执行结果，request 函数返回的是 umiInstance 函数，所以到目前 umi-request 库默认返回的就是 umiInstance 方法，这个方法还被添加了很多属性和方法，下面一点点来看 request 方法做了什么？

#### 创建了一个 coreInstance 实例

这个实例是通过 `./core` 导出的 Core 类创建的，传入的参数是 request 函数传入的参数，我们去看看 Core 类做了什么？

1）初始化了一个 onion 实例，也就是洋葱模型，它在这里主要是管理和执行中间件，这里把中间件分为了三类：

- 全局中间件 最先执行
- 核心中间件 第二执行
- 实例中间件 最后执行

使用洋葱模型中间件优势是：

1. 可以灵活地添加/移除中间件
2. 保证中间件的执行顺序
3. 每个中间件都可以对请求和响应进行处理
4. 支持异步操作
5. 方便扩展和维护，例如添加日志中间件，缓存中间件，错误处理等等，这些中间件都能享受洋葱模型的执行顺序

2）提供了一个 use 方法，可以添加中间件，这个方法返回的是 coreInstance 实例，所以可以链式调用

3）提供了 extendOptions 方法，可以扩展配置，这个方法返回的是 coreInstance 实例，所以可以链式调用，使用场景是实例创建后动态修改配置

4）提供了 dealRequestInterceptors 方法，接收一个请求信息对象，返回一个 promise 对象，这个方法主要是处理请求拦截器，请求拦截器是全局中间件，所以最先执行，然后执行实例中间件，最后执行核心中间件

5）提供了 request 方法，接收 url 和参数，返回一个 promise 对象，这个方法主要是处理请求

6）在 core 中，引入了 onion 类 、 一些的中间件和 工具函数，让我们先来下 onion 类吧！
它就是一个中间件管理器，定义了两种中间件类型：

- globalMiddlewares 全局中间件
- coreMiddlewares 核心中间件
  还有额外两种：
- middlewares 实例中间件
- defaultInstance 默认实例中间件

它有两个方法：

- use 添加中间件
- execute 执行中间件

7）让我们再来看看 core 类中引入的一些中间件

1. addfixInterceptor 前后缀拦截器
2. fetchMiddleware 请求中间件
3. parseResponseMiddleware 解析响应中间件
4. simpleGet 简单 get 请求中间件
5. simplePost 简单 post 请求中间件

8）core 中的工具函数

1. MapCache 缓存工具类。通过一个 Map 对象来存储缓存数据，并提供了 get 和 set 方法来获取和设置缓存
2. mergeRequestOptions 合并请求参数

#### 请求实例创建

#### 中间件绑定

#### 拦截器配置

#### HTTP 方法简写

#### 请求取消功能

#### 中间件实例暴露

函数式编程思想，闭包保持了实例的状态

4）看 test 目录了解库的测试，尤其是单元测试

5）看 examples 目录了解库的一些使用 demo
