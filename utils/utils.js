const util = require('util');
const logger = require('./logger');

const objToStrHelper = obj => {
  const newObj = util.inspect(obj, {
    showHidden: false,
    depth: 1,
    colorize: true,
  });
  logger.info(newObj);

  return JSON.stringify(newObj, null, '');
};

module.exports = {
  objToStrHelper,
};
