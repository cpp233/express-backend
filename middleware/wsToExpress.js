// 待完成：
// 静态目录
// 嵌套路由

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
// const url = require('url');

const config = require('../utils/config');
const logger = require('../utils/logger');
const { objToStrHelper } = require('../utils/utils');

class WsToExpress {
  _pollInterval = null;
  _reqEvent = new Map();
  _roomEvent = new Map();
  _rooms = new Map();
  _clients = new Set();
  _isJson = false;

  constructor() {}

  #close() {
    this.stopPool();
    this._reqEvent.clear();
    this._rooms.clear();
    this._clients.clear();
  }

  listen(serviceConfig) {
    this._WSS = new WebSocket.WebSocketServer(serviceConfig);

    this._WSS.on('connection', async (client, req) => {
      // ws 单独的权限认证
      try {
        const decodedToken = await jwt.verify(client.protocol, config.SECRET);
        logger.info('decodedToken:', decodedToken);
      } catch (err) {
        logger.info('invalid token');
        client.send('invalid token');
        client.terminate();
        return -1;
      }

      if (process.env.NODE_ENV === 'development') {
        global.gc();
        logger.info('new user 内存用量', process.memoryUsage());
        logger.info(
          `client ${req.socket.remoteAddress} connected - Protocol ${client.protocol}`
        );
        logger.info(`clients length: ${Array.from(this._WSS.clients).length}`);
      }

      // 执行顺序要在最前面
      if (this._isJson) {
        client.addEventListener('message', ({ data, isBinary }) => {
          // 如果需要进一步工程化，此处做一些判断，目前过滤掉非json的数据
          try {
            client.body = !isBinary && JSON.parse(data);
            // logger.info('JSON: %s', client.body);
          } catch (error) {
            logger.info('JSON error: %s');
            client.body = { type: 'default' };
          }
        });
      }

      // 路由模拟
      const baseURL = 'ws' + '://' + req.headers.host + '/';
      const urlObj = new URL(req.url, baseURL);
      const pathObj = path.parse(req.url);
      // logger.info(urlObj, pathObj);
      const urlKey = urlObj.pathname || pathObj.dir;

      // websocket 和 http 不一样，不需要这个
      // for (let [key, value] of this._reqEvent.keys()) {
      //   const reg = new RegExp(key, 'igs');
      //   if (reg.test(req.url)) {
      //     console.log('已匹配:', req.url);
      //   }
      // }

      // 如果要实现静态目录，判断 url 里面是否有静态目录的关键字
      if (this._reqEvent.has(urlKey)) {
        // 添加房间信息等等
        if (!this._rooms.has(urlKey)) {
          this._rooms.set(urlKey, {
            pollingMessage: async () => {
              `you at ${urlKey} room`;
            },
            clients: new Set(),
          });
        }
        this._rooms.get(urlKey).clients.add(client);
        this._clients.add(client);
        client._room = urlKey;
        client._isPooling = false;
        // 执行用户的回调函数
        this._reqEvent.get(urlKey)(client, req, this);
      } else {
        client.send(404);
        client.terminate();
      }

      // 其他事件，是否需要进一步封装等待后续。
      client.on('message', (data, isBinary) => {
        logger.info('service received: %s', data, isBinary);
      });
      client.on('close', (code, message) => {
        logger.info(
          `client ${req.socket.remoteAddress} closed - Code ${code} - Message ${message}`
        );
        // 离开房间
        this._rooms.get(urlKey).clients.delete(client);
        this._clients.delete(client);
      });
      client.on('error', error => {
        logger.info(`client ${req.socket.remoteAddress} error -  ${error}`);
      });
    });

    this._WSS.on('listening', async () => {
      logger.info('ws 服务器已启动');
      if (process.env.NODE_ENV === 'development') {
        global.gc();
        logger.info('listening 内存用量:', process.memoryUsage());
        const token = await jwt.sign({ user: 'test' }, config.SECRET, {
          expiresIn: '24h',
        });
        logger.info(`test token:${token}`);
      }
      // 初始化每个房间
      this._roomEvent.forEach((value, key) => {
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

  join(url, fn) {
    this._reqEvent.set(url, fn);
  }

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
      // eslint-disable-next-line
      this._rooms.forEach(async (room, roomName) => {
        const message = await room.pollingMessage();
        room.clients.forEach(client => {
          if (
            client.readyState === WebSocket.WebSocket.OPEN &&
            client._isPooling
          ) {
            client.send(message, { binary: false });
          }
        });
      });
    }, config.POLLINTERVAL);
  }

  stopPool() {
    clearInterval(this._pollInterval);
  }

  debug(client, req) {
    try {
      client.send(`client:${objToStrHelper(client)}`, {
        binary: false,
      });
      client.send(`req:${objToStrHelper(req)}`, {
        binary: false,
      });
    } catch (error) {
      client.send(`${typeof error} ${objToStrHelper(error)}`, {
        binary: false,
      });
    }
  }
}

module.exports = WsToExpress;
