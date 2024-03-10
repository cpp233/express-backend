# 技术栈

- Express
- Mongoose
- Websocket
- Jest
- ESLint

# 环境变量

新建 `.env` 文件，它们带有以下默认值：

```bash
#  数据库地址
MONGODB_URI = 'mongodb://127.0.0.1:27017/demoAdmin';
#  测试数据库地址
TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/demoAdmin-test';
# 后台服务器端口号
PORT = 3001
# 网页服务器端口号
WEB_PORT=3002
# 网页服务器文件夹
WEB_DIR='public'
#  jwt的secret
SECRET = 'jwt';
# websocket 轮询广播间隔
POLLINTERVAL = 2000
```

# 运行

```shell
pnpm i
pnpm  run start
```

# 测试

```shell
pnpm run test
```

# 完成功能一览

- [√] 内存缓存中间件，对 RESTful Api 的请求缓存处理
- [√] WebSocket library `ws` 封装，设计 `join` `room` api
- [√] 路由 `item` 创建、删除、修改、查询
- [√] 路由 `user` 登录/注册
- [√] middleware : 抽取 token 到 `request.token` 字段
- [√] middleware : 对 POST `request` 中 body 进行日志打印
- [√] middleware : 自定义 morgan 格式
- [√] middleware : 鉴权访问控制
- [√] 单元测试
