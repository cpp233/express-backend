const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
// const url = require('url');

const config = require('./config');
const logger = require('./logger');
const { objToStrHelper } = require('./utils');

class WsToExpress {
  _pollInterval = null;
  _reqEvent = new Map();
  _roomEvent = new Map();
  _rooms = new Map();
  _clients = new Set();
  _isJson = false;
  _heartbeatMessage = JSON.stringify({ type: 'heartbeat' });
  _heartbeatInterval = 1000;

  constructor() {
    this._heartbeatInterval =
      process.env.NODE_ENV === 'development' ? 1000 : 30000;
  }

  #close() {
    // 停止消息轮训
    this.stopPool();
    // 清除 join 规则
    this._reqEvent.clear();
    // 清除 room 规则
    this._roomEvent.clear();
    // 清除 rooms 标记
    this._rooms.clear();
    // 清除 clients 标记
    this._clients.clear();
  }

  listen(serviceConfig, callbackFn) {
    // _WSS WebSocketServer;
    this._WSS = new WebSocket.WebSocketServer(serviceConfig);

    this._WSS.on('connection', async (client, req) => {
      // ws 单独的权限认证
      try {
        const decodedToken = await jwt.verify(client.protocol, config.SECRET);
        logger.info('decodedToken:', decodedToken);
      } catch (err) {
        logger.info('invalid token', client.protocol);
        const errorMessage = JSON.stringify({
          type: 'error',
          message: `WebSocket error: ${err.message}`,
        });
        client.send(errorMessage);
        client.terminate();
        return -1;
      }

      if (process.env.NODE_ENV === 'development') {
        global.gc();
        logger.info('new user mem usage: ', process.memoryUsage());
        logger.info(
          `client ${req.socket.remoteAddress} connected - Protocol ${client.protocol}`
        );
        logger.info(`clients length: ${Array.from(this._WSS.clients).length}`);
      }

      // 模拟 express.json 。将 message json 化，执行顺序放其他 message 前面，给后面的消息提供 body 支持
      if (this._isJson) {
        client.addEventListener('message', ({ data, isBinary }) => {
          // 如果需要进一步工程化，此处做一些判断，目前过滤掉非json的数据
          try {
            client.body = !isBinary && JSON.parse(data);
            // logger.info('JSON: %s', client.body);
          } catch (error) {
            // 如果遇到 二进制 或者无法 json 的格式，报错。单独处理
            console.error('JSON error: %s');
            client.body = { type: 'default' };
          }
        });
      }

      // logger.info(req);
      // logger.info(req.headers.origin);
      // 模拟路由， 对 path 模拟
      const protocol = 'ws';
      // const protocol = req.headers.origin.includes('https') ? 'wss' : 'ws';
      const baseURL = protocol + '://' + req.headers.host + '/';
      const urlObj = new URL(req.url, baseURL);
      const pathObj = path.parse(req.url);
      // logger.info(urlObj, pathObj);
      const urlKey = urlObj.pathname || pathObj.dir;

      // logger.info({ baseURL, urlObj, pathObj });

      // websocket 和 http 不一样，不需要这个
      // for (let [key, value] of this._reqEvent.keys()) {
      //   const reg = new RegExp(key, 'igs');
      //   if (reg.test(req.url)) {
      //     console.log('已匹配:', req.url);
      //   }
      // }

      // 如果要实现静态目录，判断 url 里面是否有静态目录的关键字
      // 判断是否设置了 join。如果未设置，模拟 404 不存在。
      if (!this._reqEvent.has(urlKey)) {
        const errorMessage = JSON.stringify({
          type: 'error',
          Status: 404,
          message: 'Room is not exist',
        });
        client.send(errorMessage);
        client.terminate();
        return;
      }

      // 判断设置了 join 之后，有没有设置 room
      if (!this._rooms.has(urlKey)) {
        // room 的设置
        this._rooms.set(urlKey, {
          pollingMessage: async () => {
            `you at ${urlKey} room`;
          },
          clients: new Set(),
        });
      }

      // 把当前用户加入当前 room 的 clients
      this._rooms.get(urlKey).clients.add(client);
      // 把当前用户加入总 clients
      this._clients.add(client);
      // 给 client 加上当前所处 room
      client._room = urlKey;
      client._isPooling = false;
      // 执行 join 的函数
      this._reqEvent.get(urlKey)(client, req, this);

      // 定时向客户端发送心跳包
      // const heartbeatTimer = setInterval(() => {
      //   if (client.readyState === WebSocket.CLOSED) {
      //     clearInterval(heartbeatTimer);
      //   }
      //   if (client.readyState === WebSocket.OPEN) {
      //     // client.ping('p', false, e => {
      //     //   logger.info('ping error', e);
      //     // });
      //     client.send(this._heartbeatMessage);
      //   }
      //   logger.info(
      //     client._socket._peername,
      //     'send heartbeat message',
      //     client.readyState
      //   );
      // }, this._heartbeatInterval);

      // 健康检查
      const heartbeatTimer = setInterval(() => {
        // logger.info(
        //   client._socket._peername,
        //   'heartbeat',
        //   client.isAlive,
        //   heartbeatTimer
        // );
        if (client.isAlive === false) {
          clearInterval(heartbeatTimer);
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      }, this._heartbeatInterval);
      client.on('pong', () => {
        // logger.info(client._socket._peername, 'pong');
        client.isAlive = true;
      });

      // 其他事件，是否需要进一步封装等待后续。
      // 健康检测在这里处理，后期根据需要，再考虑是否应该扩展到 join 中
      client.on('message', (data, isBinary) => {
        logger.info(
          'service received: ',
          data.toString(),
          ',isBinary:',
          isBinary
        );
      });
      client.on('close', (code, message) => {
        logger.info(
          `client ${req.socket.remoteAddress} closed - Code ${code} - Message ${message}`
        );
        // 手动 close 离开房间
        this._rooms.get(urlKey).clients.delete(client);
        this._clients.delete(client);
        // clearInterval(heartbeatTimer);
      });
      client.on('error', error => {
        logger.info(`client ${req.socket.remoteAddress} error -  ${error}`);
        // 意外 报错 离开房间
        this._rooms.get(urlKey).clients.delete(client);
        this._clients.delete(client);
        // clearInterval(heartbeatTimer);
      });
    });

    this._WSS.on('listening', async () => {
      callbackFn();

      if (process.env.NODE_ENV === 'development') {
        global.gc();
        logger.info('listening 内存用量:', process.memoryUsage());
        const token = await jwt.sign({ user: 'test' }, config.SECRET, {
          expiresIn: '24h',
        });
        logger.info(`websocket test token:${token}`);
      }

      // 初始化每个房间
      this._roomEvent.forEach((value, key) => {
        // 如果房间列表不包含，则新增
        if (!this._rooms.has(key)) {
          this._rooms.set(key, {
            pollingMessage: () => {
              `you at ${key} room`;
            },
            clients: new Set(),
          });
        }

        value(this._rooms.get(key));
      });
      // get(urlKey)(client, req, this);

      // 开启消息轮询
      this.startPool();
    });

    this._WSS.on('error', error => {
      logger.info(`underlying server error:${error}`);
      this.#close();
    });

    this._WSS.on('close', () => {
      logger.info('server close.');
      this.#close();
    });
  }

  // 给发送过来的消息设置规则。比如该客户端是否加入轮训队列、
  join(url, fn) {
    this._reqEvent.set(url, fn);
  }

  // 给 room 设置规则。比如设置这个房间的轮训消息。
  room(url, fn) {
    this._roomEvent.set(url, fn);
  }

  json() {
    this._isJson = true;
  }

  static(staticPath) {
    this._staticPath = staticPath;
    logger.info('the function is not implemented');
  }

  startPool() {
    this._pollInterval = setInterval(() => {
      for (const client of this._clients) {
        logger.info(
          '_pollInterval client:',
          // Object.keys(client),
          client._socket._peername,
          'readyState:',
          client.readyState
        );
      }
      this._rooms.forEach(async (room, _roomName) => {
        const data = await room.pollingMessage();
        room.clients.forEach(client => {
          if (
            client.readyState === WebSocket.WebSocket.OPEN &&
            client._isPooling
          ) {
            const message = JSON.stringify({
              type: 'success',
              message: data,
            });
            client.send(message, { binary: false });
          }
          // logger.info('_pollInterval client:', client.readyState);
        });
      });
    }, config.POLLINTERVAL);
  }

  stopPool() {
    clearInterval(this._pollInterval);
  }

  debug(client, req) {
    try {
      const message1 = JSON.stringify({
        type: 'debug',
        message: `client:${objToStrHelper(client)}`,
      });
      client.send(message1, { binary: false });
      const message2 = JSON.stringify({
        type: 'debug',
        message: `req:${objToStrHelper(req)}`,
      });
      client.send(message2, { binary: false });
    } catch (error) {
      const message3 = JSON.stringify({
        type: 'debug',
        message: `${typeof error} ${objToStrHelper(error)}`,
      });
      client.send(message3, { binary: false });
    }
  }
}

module.exports = WsToExpress;
