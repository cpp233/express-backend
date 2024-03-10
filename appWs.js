const WsToExpress = require('./utils/wsToExpress');
const logger = require('./utils/logger');
const { objToStrHelper } = require('./utils/utils');
const { getCpusUse, getMemoryUse } = require('./utils/systeminfo');

const appWs = new WsToExpress();

appWs.json();

appWs.join('/', client => {
  client.send('you are /');
});

appWs.join('/hardwareMonitor', async (client, req, service) => {
  // 用 dispatchEvent 事件配合 promise 进行等待消息？
  client.addEventListener('message', () => {
    // logger.info('route data: %s', data, isBinary);
    logger.info('join room body: ', client.body);
    switch (client.body.type) {
      case 'getRooms':
        client.send(`${objToStrHelper(service._rooms)}`);
        break;
      case 'getClients':
        client.send(`${objToStrHelper(service._clients)}`);
        break;
      case 'joinPooling':
        client._isPooling = true;
        // client.send('you are join pooling');
        break;
      case 'leavePooling':
        client._isPooling = false;
        // client.send('you are join pooling');
        break;
      case 'exit':
        client.terminate();
        break;
      default:
        client.send('unknown type');
        break;
    }
  });
});

appWs.room('/hardwareMonitor', room => {
  room.pollingMessage = async () => {
    const cpuUse = await getCpusUse();
    const memoryUse = await getMemoryUse();
    const hardwareMonitor = JSON.stringify({ cpuUse, memoryUse });
    return hardwareMonitor;
  };
});

module.exports = appWs;
