const logger = require('../../utils/logger');
const {
  helper_decodeOptions,
  helper_isMatch,
  helper_makeKey,
  MemoryCache,
} = require('./utils');

// 两处，第一处
const DEBUG_MEM_CACHE = false;

const myMiddleware = (request, response, next, options, memoryCache) => {
  const { includes, excludes, strict, debugPath, forceKey, ruleMethods } =
    options;
  const path = request.path;
  const method = request.method;

  // debug用，返回缓存结果
  if (debugPath && path === debugPath) {
    return response.json(memoryCache.getCacheList());
  }

  const isExclude = helper_isMatch(path, excludes);

  // exclude 优先级大于 include
  if (isExclude) {
    DEBUG_MEM_CACHE && logger.info('此路径不和缓存联动:', path);
    return next();
  }

  const isInclude = helper_isMatch(path, includes);
  if (!isInclude) {
    DEBUG_MEM_CACHE && logger.info('此路径不和缓存联动:', path);
    return next();
  }

  // 抽取出 force 关键字，避免 force 进入 key
  const { [forceKey.query]: _queryForce, ...requestQuery } = request.query;
  const { [forceKey.body]: _bodyForce, ...requestBody } = request.body;
  const key = helper_makeKey({
    path,
    // requestQuery: request.query,
    requestQuery,
    // requestBody: request.body,,
    requestBody,
  });

  // hook
  const originalJsonFn = response.json;
  response.json = body => {
    DEBUG_MEM_CACHE && logger.info('enter json hook.');

    if (!/(2\d\d)|(304)/.test(response.statusCode)) {
      DEBUG_MEM_CACHE &&
        logger.info(
          '只有 2xx|304 status code 才进行缓存操作:',
          response.statusCode
        );
      return originalJsonFn.call(response, body);
    }

    // 抽象成 method 调度器自动处理。在此层不关心缓存的逻辑
    memoryCache.methodDispatcher({
      method,
      key,
      strict,
      responseBody: body,
      ruleMethods: ruleMethods,
    });

    return originalJsonFn.call(response, body);
  };

  // delete 一般不使用 json， hook end.
  const originalEndFn = response.end;
  response.end = body => {
    DEBUG_MEM_CACHE && logger.info('enter end hook.');
    if (method.toUpperCase() === 'DELETE') {
      // 抽象成 method 调度器自动处理。在此层不关心缓存的逻辑
      memoryCache.methodDispatcher({
        method,
        key,
        strict,
        responseBody: body,
        ruleMethods: ruleMethods,
      });
    }

    return originalEndFn.call(response, body);
  };

  // 只有 GET 请求，才使用缓存
  if (method.toUpperCase() !== 'GET') {
    return next();
  }

  // 强制获取 GET 结果，无视缓存。 强制跳转到路由
  if (request.query[forceKey.query] || request.body[forceKey.body]) {
    return next();
  }

  const cache = memoryCache.getCache({ key });

  if (cache.cacheHit) {
    response.setHeader('X-Cache', 'HIT');
    return originalJsonFn.call(response, cache.cachedData);
  }

  DEBUG_MEM_CACHE &&
    logger.info('Middleware Root:', {
      path,
      method,
      includes,
      excludes,
      isExclude,
      isInclude,
      key,
    });

  next();
};

const middlewareWrapper = options => {
  const { ttl, max, ...other } = options;
  const decodeOptions = helper_decodeOptions(options);

  const memoryCache = new MemoryCache({ ttl, max });

  if (other.debugPath) {
    logger.info('MemCache Middleware Debug Path:', other.debugPath);
  }
  return (req, res, next) => {
    myMiddleware(req, res, next, decodeOptions, memoryCache);
  };
};

module.exports = middlewareWrapper;
