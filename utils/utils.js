const util = require('util');

const objToStrHelper = obj => {
  const newObj = util.inspect(obj, {
    showHidden: false,
    depth: 1,
    colorize: true,
  });
  return JSON.stringify(newObj, null, '');
};

module.exports = {
  objToStrHelper,
};
