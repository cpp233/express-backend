const memCache = require('./memCache/index');

const memoryCacheConfig = () => {
  return memCache({
    ttl: 7 * 24 * 60 * 60 * 1000,
    max: 50000,
    includes: [new RegExp('/api/v1/admin/items')],
    excludes: [
      new RegExp('/api/v1/admin/users'),
      new RegExp('/api/v1/admin/login'),
    ],
    strict: true,
    debugPath: '/api/v1/debug/cache',
    forceKey: 'force',
    ruleList: {
      method: {
        // get: () => {},
        // post: () => {},
        // put: () => {},
        delete: ({
          requestPath,
          requestParentPath,
          requestQuery,
          requestBody,
          curKeyPath,
          curKeyRequestQuery,
          curKeyRequestBody,
        }) => {
          // console.log('customRule:', {
          //   requestPath,
          //   requestParentPath,
          //   requestQuery,
          //   requestBody,
          //   curKeyPath,
          //   curKeyRequestQuery,
          //   curKeyRequestBody,
          // });

          const idList = requestQuery?.idList.split(',');
          return idList.some(id => {
            return curKeyPath === requestPath + id;
          });
        },
      },
    },
    // routeList: [itemsRouter, usersRouter, loginRouter],
  });
};

module.exports = memoryCacheConfig;
