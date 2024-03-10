/* eslint-disable indent */
const util = require('node:util');

const getLogTime = () => {
  const result = [];

  result.push('%c%s');
  result.push('color: #5f6368; font-size: 12px');

  const now = new Date();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const millisecond = now.getMilliseconds().toString().padStart(3, '0');

  result.push(`${hour}:${minute}:${second}.${millisecond}`);

  return result;
};

const info = (...params) => {
  if (process.env.NODE_ENV !== 'test') {
    // 如果 params 中含有 object
    const newParams = params.map(param => {
      return typeof param === 'object'
        ? util.inspect(param, {
            showHidden: false,
            // depth: null,
            depth: 2,
            color: true,
          })
        : param;
    });

    const str = [...getLogTime(), ...newParams];
    // ...getFormatStr(...getLogTime(), ...params)
    console.log(...str);
  }
};

const error = (...params) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(...getLogTime(), ...params);
  }
};

module.exports = {
  info,
  error,
};
