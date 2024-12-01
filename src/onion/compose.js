// 返回一个组合了所有插件的“插件”

// compose 函数用于组合多个中间件函数
// 参数 middlewares 是一个中间件函数数组
export default function compose(middlewares) {
  // 首先验证入参必须是数组
  if (!Array.isArray(middlewares)) throw new TypeError('Middlewares must be an array!');

  // 验证数组中每一项都必须是函数
  const middlewaresLen = middlewares.length;
  for (let i = 0; i < middlewaresLen; i++) {
    if (typeof middlewares[i] !== 'function') {
      throw new TypeError('Middleware must be componsed of function');
    }
  }

  // 返回一个包装函数,接收请求参数和next函数
  return function wrapMiddlewares(params, next) {
    // 记录当前执行到第几个中间件
    let index = -1;

    // dispatch函数用于派发执行第i个中间件
    function dispatch(i) {
      // 确保在一个中间件中next()只能调用一次
      if (i <= index) {
        return Promise.reject(new Error('next() should not be called multiple times in one middleware!'));
      }
      
      // 更新index
      index = i;

      // 获取要执行的中间件函数,如果已经执行完所有中间件则使用next
      const fn = middlewares[i] || next;
      
      // 如果没有中间件函数要执行了,返回成功的promise
      if (!fn) return Promise.resolve();

      try {
        // 执行中间件函数,传入params和next函数
        // next函数会调用下一个中间件
        return Promise.resolve(fn(params, () => dispatch(i + 1)));
      } catch (err) {
        // 捕获同步错误并reject
        return Promise.reject(err);
      }
    }

    // 从第一个中间件开始执行
    return dispatch(0);
  };
}
