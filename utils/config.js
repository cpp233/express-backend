require('dotenv').config();
const path = require('path');

const HTTPPORT = process.env.PORT || 3001;
const WEB_PORT = process.env.WEB_PORT || 5000;
const WEB_DIR = process.env.WEB_DIR || 'public';
// path.join(__dirname + '/public');
const SECRET = process.env.SECRET || 'jwt';
const POLLINTERVAL = process.env.POLLINTERVAL || 2000;

let MONGODB_URI = '';
if (process.env.NODE_ENV === 'test') {
  MONGODB_URI =
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/demoAdmin-test';
} else {
  MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/demoAdmin';
}

module.exports = {
  HTTPPORT,
  WEB_PORT,
  WEB_DIR,
  MONGODB_URI,
  SECRET,
  POLLINTERVAL,
};
