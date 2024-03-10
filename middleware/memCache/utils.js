const logger = require('../../utils/logger');

// 两处，第二处
const DEBUG_MEM_CACHE = false;

const helper_decodeOptions = options => {
  // 设置成默认值吧，太严格使用起来不友好
  // if (!options || typeof options !== 'object') {
  //   throw new Error('Invalid options');
  // }

  const decode = {
    includes: [],
    excludes: [],
    strict: true,
    debugPath: null,
    forceKey: {
      query: '',
      body: '',
    },
    ruleMethods: {
      get: () => {},
      post: () => {},
      put: () => {},
      delete: () => {},
    },
  };
  const { includes, excludes, strict, debugPath, forceKey, ruleMethods } =
    options;

  if (includes instanceof Array || typeof includes === 'string') {
    decode.includes = includes;
  }

  if (excludes instanceof Array || typeof excludes === 'string') {
    decode.excludes = excludes;
  }

  if (typeof strict === 'boolean') {
    decode.strict = strict;
  }

  if (typeof debugPath === 'string') {
    decode.debugPath = debugPath;
  }

  if (forceKey !== null && typeof forceKey === 'object') {
    if (forceKey.query && typeof forceKey.query === 'string') {
      decode.forceKey.query = forceKey.query;
    }

    if (forceKey.body && typeof forceKey.body === 'string') {
      decode.forceKey.body = forceKey.body;
    }
  }

  if (forceKey !== null && typeof forceKey === 'object') {
    if (forceKey.query && typeof forceKey.query === 'string') {
      decode.forceKey.query = forceKey.query;
    }

    if (forceKey.body && typeof forceKey.body === 'string') {
      decode.forceKey.body = forceKey.body;
    }
  }

  if (ruleMethods !== null && typeof ruleMethods === 'object') {
    if (ruleMethods.get && typeof ruleMethods.get === 'function') {
      decode.ruleMethods.get = ruleMethods.get;
    }

    if (ruleMethods.post && typeof ruleMethods.post === 'function') {
      decode.ruleMethods.post = ruleMethods.post;
    }

    if (ruleMethods.put && typeof ruleMethods.put === 'function') {
      decode.ruleMethods.put = ruleMethods.put;
    }

    if (ruleMethods.delete && typeof ruleMethods.delete === 'function') {
      decode.ruleMethods.delete = ruleMethods.delete;
    }
  }

  return decode;
};

const helper_isForce = ({ forceKey, request }) => {
  if (forceKey === undefined) {
    return false;
  }
  const queryForce = request?.query?.[forceKey];
  const bodyForce = request?.body?.[forceKey];

  return Boolean(queryForce || bodyForce);
};

const helper_isMatch = (path, pattern) => {
  if (typeof pattern === 'string') {
    return path === pattern;
  }

  if (!Array.isArray(pattern)) {
    throw new Error('unknown type pattern.', pattern);
  }

  const isMatch = pattern.some(rule => {
    if (typeof rule === 'string') {
      return path === rule;
    }

    if (rule instanceof RegExp) {
      return rule.test(path);
    }
    return false;
    // throw new Error('Invalid pattern');
  });

  return isMatch;
};

const helper_makeKey = ({ path, requestQuery, requestBody }) => {
  // 排序保证结果一致性
  const sortObject = object => {
    const result = {};
    const sortedKeys = Object.keys(object).sort();

    for (let key of sortedKeys) {
      result[key] = object[key];
    }

    return result;
  };

  return JSON.stringify({
    path,
    requestQuery: sortObject(requestQuery),
    requestBody: sortObject(requestBody),
  });
};

const helper_isEmptyObject = obj => {
  return JSON.stringify(obj) === '{}';
};

class MemoryCache {
  #store = null;
  #MAX_LENGTH = 0;
  #TTL = 0;

  constructor({ ttl, max }) {
    this.#store = new Map();
    this.#MAX_LENGTH = max || 1000;
    this.#TTL = ttl || 1 * 24 * 60 * 60 * 1000;
    // this.#MAX_LENGTH = 50000;
    // this.#TTL = 24 * 60 * 60 * 1000; // ms
  }

  getCache({ key }) {
    const result = {
      cacheHit: false,
      cachedData: null,
    };

    const value = this.#store.get(key);

    if (!value) {
      return result;
    }

    // 查看 ttl 是否过期
    const now = Date.now();
    if (now > value.cacheExpire) {
      return result;
    }

    result.cacheHit = true;
    result.cachedData = value.cachedData;

    // 将该数据从Map中删除
    this.#store.delete(key);
    // 将该数据重新插入Map的末尾，表示该数据被使用了
    this.#store.set(key, { ...value, hitCount: value.hitCount + 1 });

    return result;
  }

  getCacheList() {
    const result = [];
    for (let [key, value] of this.#store.entries()) {
      // logger.info({ key, value });
      const { cachedData: cachedData, ...other } = value;
      result.push({
        key: JSON.parse(key),
        value: { ...other, cachedData: cachedData ? '...' : '' },
      });
    }
    return result;
  }

  updateCache({ key, responseBody }) {
    DEBUG_MEM_CACHE &&
      logger.info('updateCache', {
        key,
        responseBody: responseBody ? '...' : '',
      });

    // 如果缓存中有，则擦除并将该数据插入Map的末尾
    if (this.#store.has(key)) {
      this.#store.delete(key);
    }

    const value = {
      cachedData: responseBody,
      cacheExpire: Date.now() + this.#TTL,
      hitCount: 0,
    };
    this.#store.set(key, value);

    // 如果缓存已满，删除Map中的头部数据(最少使用的数据)
    if (this.#store.size > this.#MAX_LENGTH) {
      // Map 的遍历顺序就是插入顺序
      const fistKey = this.#store.keys().next().value;
      this.#store.delete(fistKey);
    }
  }

  #handleGetRequest({ key, responseBody }) {
    this.updateCache({ key, responseBody });
  }

  #handlePostRequest({
    strict,
    requestPath,
    requestParentPath,
    requestQuery,
    requestBody,
    rule,
  }) {
    // 严格模式警告

    // POST 请求删除上一级 path 的 List
    [...this.#store.keys()]
      .filter(curKey => {
        const {
          path: curKeyPath,
          requestQuery: curKeyRequestQuery,
          requestBody: curKeyRequestBody,
        } = JSON.parse(curKey);

        let isMatch = undefined;
        if (typeof rule === 'function') {
          isMatch = rule({
            requestPath,
            requestParentPath,
            requestQuery,
            requestBody,
            curKeyPath,
            curKeyRequestQuery,
            curKeyRequestBody,
          });
        }

        return (
          isMatch ||
          // curKeyPath === requestParentPath ||
          curKeyPath === requestPath
        );
      })
      .map(curKey => {
        this.#store.delete(curKey);
        DEBUG_MEM_CACHE && logger.info('handlePostRequest:', { curKey });
      });
  }

  #handlePutRequest({
    strict,
    requestPath,
    requestParentPath,
    requestQuery,
    requestBody,
    rule,
  }) {
    // 严格模式警告

    [...this.#store.keys()]
      .filter(curKey => {
        const {
          path: curKeyPath,
          requestQuery: curKeyRequestQuery,
          requestBody: curKeyRequestBody,
        } = JSON.parse(curKey);

        let isMatch = undefined;
        if (typeof rule === 'function') {
          isMatch = rule({
            requestPath,
            requestParentPath,
            requestQuery,
            requestBody,
            curKeyPath,
            curKeyRequestQuery,
            curKeyRequestBody,
          });
        }

        return (
          isMatch ||
          curKeyPath === requestParentPath ||
          curKeyPath === requestPath
        );
      })
      .map(curKey => {
        this.#store.delete(curKey);
        DEBUG_MEM_CACHE && logger.info('handlePutRequest:', { curKey });
      });
  }

  #handleDeleteRequest({
    strict,
    requestPath,
    requestParentPath,
    requestQuery,
    requestBody,
    rule,
  }) {
    // 严格模式警告
    if (
      strict &&
      (!helper_isEmptyObject(requestQuery) ||
        !helper_isEmptyObject(requestBody)) &&
      typeof rule !== 'function'
    ) {
      console.warn(
        'requestQuery | requestBody 不为空，同时未检测到自定义规则函数，将清空 path 下所有缓存条目。'
      );
    }

    [...this.#store.keys()]
      .filter(curKey => {
        const {
          path: curKeyPath,
          requestQuery: curKeyRequestQuery,
          requestBody: curKeyRequestBody,
        } = JSON.parse(curKey);

        let isMatch = undefined;
        if (typeof rule === 'function') {
          isMatch = rule({
            requestPath,
            requestParentPath,
            requestQuery,
            requestBody,
            curKeyPath,
            curKeyRequestQuery,
            curKeyRequestBody,
          });
        }

        // 严格模式检查
        if (strict && isMatch === undefined) {
          isMatch =
            !helper_isEmptyObject(requestQuery) ||
            !helper_isEmptyObject(requestBody);
        }

        return (
          isMatch ||
          curKeyPath === requestParentPath ||
          curKeyPath === requestPath
        );
      })
      .map(curKey => {
        this.#store.delete(curKey);
        DEBUG_MEM_CACHE && logger.info('handleDeleteRequest:', { curKey });
      });
  }

  // 抽象成根据不同条件，进行调度的情况，也方便后续新增其他调度函数
  // 各种 method 自定义处理规则
  methodDispatcher({ method, key, strict, responseBody, ruleMethods }) {
    const { path: requestPath, requestQuery, requestBody } = JSON.parse(key);
    const requestParentPath = requestPath.split('/').slice(0, -1).join('/');

    DEBUG_MEM_CACHE &&
      logger.info('methodDispatcher:', {
        method,
        key,
        strict,
        responseBody: responseBody ? '...' : '',
        // ,
        requestPath,
        requestQuery,
        requestBody,
      });

    switch (method.toUpperCase()) {
      case 'GET':
        // 首次 GET ，缓存
        // memoryCache2.updateCache({ key, responseBody });
        this.#handleGetRequest({ key, responseBody });
        break;
      case 'POST':
        this.#handlePostRequest({
          strict,
          requestPath,
          requestParentPath,
          requestQuery,
          requestBody,
          rule: ruleMethods.post,
        });
        break;
      case 'PUT':
        this.#handlePutRequest({
          strict,
          requestPath,
          requestParentPath,
          requestQuery,
          requestBody,
          rule: ruleMethods.put,
        });
        break;
      case 'DELETE':
        this.#handleDeleteRequest({
          strict,
          requestPath,
          requestParentPath,
          requestQuery,
          requestBody,
          rule: ruleMethods.delete,
        });
        break;
      default:
        // 其他 method，不和缓存联动，默认处理
        break;
    }

    //
    return;
  }
}

module.exports = {
  helper_decodeOptions,
  helper_isForce,
  helper_isMatch,
  helper_makeKey,
  helper_isEmptyObject,
  MemoryCache,
};
