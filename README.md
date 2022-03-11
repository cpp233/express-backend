# 技术栈

- Express
- Mongoose
- ws
- Jest
- ESLint

# 环境变量

新建 `.env` 文件，它们带有以下默认值：

```bash
#  数据库地址
MONGODB_URI = 'mongodb://127.0.0.1:27017/demoAdmin';
#  测试数据库地址
TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/demoAdmin-test';
#  服务器端口号
PORT = 3001;
#  jwt的secret
SECRET = 'jwt';
# ws 轮询广播间隔
POLLINTERVAL = 2000
```

# 运行

```shell
npm i
npm start
```

# 测试

```shell
npm test
```

# 完成功能一览

- [√] WebSocket library `ws` 再封装
- [√] Models `item` 创建、删除、修改、查询
- [√] Models `user` 登录/注册
- [√] middleware : 抽取 token 到 `request.token` 字段
- [√] middleware : 对 POST `request` 中 body 进行日志打印
- [√] middleware : 自定义 morgan 格式
- [√] middleware : 鉴权访问控制
- [√] 单元测试
