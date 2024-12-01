import Cancel from './cancel/cancel';
import CancelToken from './cancel/cancelToken';
import isCancel from './cancel/isCancel';
import Core from './core';
import Onion from './onion';
import { mergeRequestOptions } from './utils';

// 通过 request 函数，在 core 之上再封装一层，提供原 umi/request 一致的 api，无缝升级
const request = (initOptions = {}) => {
  const coreInstance = new Core(initOptions);
  const umiInstance = (url, options = {}) => {
    const mergeOptions = mergeRequestOptions(coreInstance.initOptions, options);
    return coreInstance.request(url, mergeOptions);
  };
  
  // 中间件
  // 这句代码将Core实例的use方法 和 fetchIndex 方法绑定到umiInstance上，使得用户可以通过umiInstance.use()来添加中间件。通过bind确保use方法内部的this指向正确的coreInstance。
  // 原因：这是为了保持API的一致性，让用户可以直接通过请求实例来添加中间件，而不需要直接操作内部的Core实例。

  umiInstance.use = coreInstance.use.bind(coreInstance);
  umiInstance.fetchIndex = coreInstance.fetchIndex;

  // 拦截器 
  umiInstance.interceptors = {
    request: {
      // 将Core类的requestUse方法绑定到umiInstance实例上，使得umiInstance实例可以使用requestUse方法来添加请求拦截器。
      use: Core.requestUse.bind(coreInstance),
    },
    response: {
      // 将Core类的responseUse方法绑定到umiInstance实例上，使得umiInstance实例可以使用responseUse方法来添加响应拦截器。
      use: Core.responseUse.bind(coreInstance),
    },
  };

  // 请求语法糖： reguest.get request.post ……
  const METHODS = ['get', 'post', 'delete', 'put', 'patch', 'head', 'options', 'rpc'];
  METHODS.forEach(method => {
    umiInstance[method] = (url, options) => umiInstance(url, { ...options, method });
  });
  // 取消请求
  umiInstance.Cancel = Cancel;
  // 取消请求token
  umiInstance.CancelToken = CancelToken;
  // 判断是否是取消请求
  umiInstance.isCancel = isCancel;
  // 扩展配置
  umiInstance.extendOptions = coreInstance.extendOptions.bind(coreInstance);

  // 暴露各个实例的中间件，供开发者自由组合
  umiInstance.middlewares = {
    instance: coreInstance.onion.middlewares,
    defaultInstance: coreInstance.onion.defaultMiddlewares,
    global: Onion.globalMiddlewares,
    core: Onion.coreMiddlewares,
  };

  return umiInstance;
};

/**
 * extend 方法参考了ky, 让用户可以定制配置.
 * initOpions 初始化参数
 * @param {number} maxCache 最大缓存数
 * @param {string} prefix url前缀
 * @param {function} errorHandler 统一错误处理方法
 * @param {object} headers 统一的headers
 */
export const extend = initOptions => request(initOptions);

/**
 * 暴露 fetch 中间件，保障依旧可以使用
 */
export const fetch = request({ parseResponse: false });

export default request({});
