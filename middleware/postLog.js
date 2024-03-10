const morgan = require('morgan');
const chalk = require('chalk');
// import chalk from 'chalk';

morgan.token('time', (_req, _res) => {
  const now = new Date();
  return now.toLocaleString('zh-CN');
});

morgan.token('status', (req, res) => {
  const status = (
    typeof res.headersSent !== 'boolean'
      ? Boolean(res._header)
      : res.headersSent
  )
    ? res.statusCode
    : undefined;

  // get status color
  const color =
    status >= 500
      ? 31 // red
      : status >= 400
      ? 33 // yellow
      : status >= 300
      ? 36 // cyan
      : status >= 200
      ? 32 // green
      : 0; // no color
  return `\x1b[${color}m${status}\x1b[0m`;
});

morgan.token('cache', (req, res) => {
  let result = 'Cache:';
  if (res.getHeader('x-cache')) {
    result += `${chalk.rgb(90, 255, 90).bold('Hit')}`;
  } else {
    result += `${chalk.rgb(255, 90, 90).bold('Miss')}`;
  }

  return result;
});

morgan.token('postbody', (req, res) => {
  if (req.method === 'POST') {
    return 'body:' + JSON.stringify(req.body, null, '\t');
  }
  return ' ';
});

morgan.format(
  'log',
  ':time :method :url HTTP/:http-version :status length :res[content-length] - :response-time ms :cache :postbody'
);

module.exports = morgan;
