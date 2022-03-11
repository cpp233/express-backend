const morgan = require('morgan');

morgan.token('postbody', function (req, res) {
  if (req.method === 'POST') {
    return JSON.stringify(req.body);
  }
  return ' ';
});

morgan.format(
  'log',
  ':method :url :status :res[content-length] - :response-time ms :postbody'
);

module.exports = morgan;
