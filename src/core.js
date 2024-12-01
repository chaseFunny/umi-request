import addfixInterceptor from './interceptor/addfix';
import fetchMiddleware from './middleware/fetch';
import parseResponseMiddleware from './middleware/parseResponse';
import simpleGet from './middleware/simpleGet';
import simplePost from './middleware/simplePost';
import Onion from './onion';
import { MapCache, mergeRequestOptions } from './utils';

// 初始化全局和内核中间件
const globalMiddlewares = [simplePost, simpleGet, parseResponseMiddleware];
const coreMiddlewares = [fetchMiddleware];

Onion.globalMiddlewares = globalMiddlewares;
Onion.defaultGlobalMiddlewaresLength = globalMiddlewares.length;
Onion.coreMiddlewares = coreMiddlewares;
Onion.defaultCoreMiddlewaresLength = coreMiddlewares.length;

class Core {
  constructor(initOptions) {
    this.onion = new Onion([]); // 洋葱模型中间件系统
    this.fetchIndex = 0; // 【即将废弃】请求中间件位置
    this.mapCache = new MapCache(initOptions); // 缓存系统
    this.initOptions = initOptions; // 初始化配置
    this.instanceRequestInterceptors = []; // 实例请求拦截器
    this.instanceResponseInterceptors = []; // 实例响应拦截器
  }
  // 旧版拦截器为共享
  static requestInterceptors = [addfixInterceptor]; // 共享请求拦截器
  static responseInterceptors = []; // 共享响应拦截器

  // 请求拦截器 默认 { global: true } 兼容旧版本拦截器
  static requestUse(handler, opt = { global: true }) {
    if (typeof handler !== 'function') throw new TypeError('Interceptor must be function!');
    // 请求要执行的函数
    if (opt.global) {
      Core.requestInterceptors.push(handler);
    } else {
      this.instanceRequestInterceptors.push(handler);
    }
  }

  // 响应拦截器 默认 { global: true } 兼容旧版本拦截器
  static responseUse(handler, opt = { global: true }) {
    if (typeof handler !== 'function') throw new TypeError('Interceptor must be function!');
    // 响应要执行的函数
    if (opt.global) {
      Core.responseInterceptors.push(handler);
    } else {
      this.instanceResponseInterceptors.push(handler);
    }
  }

  // 中间件添加方法
  // @param newMiddleware {Function} 新的中间件函数
  // @param opt {Object} 配置选项
  //   - opt.global {Boolean} 是否为全局中间件,默认 false
  //   - opt.core {Boolean} 是否为核心中间件,默认 false
  // @return {Core} 返回 Core 实例,支持链式调用
  use(newMiddleware, opt = { global: false, core: false }) {
    // 调用 onion 实例的 use 方法添加中间件
    this.onion.use(newMiddleware, opt);
    // 返回 this 支持链式调用
    return this;
  }
// 扩展配置方法，用于实例创建后动态修改配置
  extendOptions(options) {
    this.initOptions = mergeRequestOptions(this.initOptions, options);
    this.mapCache.extendOptions(options);
  }

  // 执行请求前拦截器，接收一个对象，对象中包含请求信息
  dealRequestInterceptors(ctx) {
    // 合并请求拦截器。p1 是上一个拦截器的 promise 返回值，p2 当前拦截器函数
    const reducer = (p1, p2) =>
      p1.then((ret = {}) => {
        // 更新请求信息
        ctx.req.url = ret.url || ctx.req.url;
        // 更新请求配置
        ctx.req.options = ret.options || ctx.req.options;
        // 执行下一个拦截器
        return p2(ctx.req.url, ctx.req.options);
      });
    // 合并共享请求拦截器和实例请求拦截器，全局先执行，实例后执行
    const allInterceptors = [...Core.requestInterceptors, ...this.instanceRequestInterceptors];
    // 串行执行请求前拦截器，返回一个 promise 对象
    return allInterceptors.reduce(reducer, Promise.resolve()).then((ret = {}) => {
      // 处理最后一个拦截器的返回值
      ctx.req.url = ret.url || ctx.req.url;
      ctx.req.options = ret.options || ctx.req.options;
      return Promise.resolve();
    });
  }

  // 请求方法
  request(url, options) {
    // 获取洋葱模型实例
    const { onion } = this;
    // 创建请求对象
    const obj = {
      req: { url, options: { ...options, url } },
      res: null,
      cache: this.mapCache,
      responseInterceptors: [...Core.responseInterceptors, ...this.instanceResponseInterceptors],
    };
    // 判断 url 是否是字符串
    if (typeof url !== 'string') {
      throw new Error('url MUST be a string');
    }

    // 返回一个 promise 对象
    return new Promise((resolve, reject) => {
      // 执行请求前拦截器
      this.dealRequestInterceptors(obj)
        // 执行请求
        .then(() => onion.execute(obj))
        .then(() => {
          // 处理响应
          resolve(obj.res);
        })
        .catch(error => {
          const { errorHandler } = obj.req.options;
          if (errorHandler) {
            try {
              // 执行错误处理函数
              const data = errorHandler(error);
              resolve(data);
            } catch (e) {
              // 执行错误处理函数失败，返回错误
              reject(e);
            }
          } else {
            // 没有错误处理函数，返回错误
            reject(error);
          }
        });
    });
  }
}

export default Core;
