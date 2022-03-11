require('dotenv').config();

const HTTPPORT = process.env.PORT || 3001;
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
  MONGODB_URI,
  SECRET,
  POLLINTERVAL,
};
