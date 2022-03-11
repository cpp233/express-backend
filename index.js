const http = require('http');
const app = require('./app');
const config = require('./utils/config');
const logger = require('./utils/logger');

const server = http.createServer(app);

server.listen(config.HTTPPORT, () => {
  logger.info(`http服务器启动在  http://localhost:${config.HTTPPORT}`);
});

const wsApp = require('./appWs');
wsApp.listen({
  server: server,
  // path: '/',
});
