const http = require('http');
const app = require('./app');
const webApp = require('./webApp');

const config = require('./utils/config');
const logger = require('./utils/logger');

const { connectDB } = require('./utils/connectDB');
connectDB();

const server = http.createServer(app);

server.listen(config.HTTPPORT, () => {
  logger.info(`Http server run at: http://localhost:${config.HTTPPORT}`);
});

const wsApp = require('./appWs');
wsApp.listen(
  {
    server: server,
    // path: '/',
  },
  () => {
    logger.info(`WebSocket server run at: ws://localhost:${config.HTTPPORT}`);
  }
);

const webServer = http.createServer(webApp);
webServer.listen(config.WEB_PORT, () => {
  logger.info(`Web server run at: http://localhost:${config.WEB_PORT}`);
});
