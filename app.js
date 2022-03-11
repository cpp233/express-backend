require('express-async-errors');
const cors = require('cors');
const express = require('express');

const postLog = require('./middleware/postLog');
const tokenExtractor = require('./middleware/tokenExtractor');
const accessPermissions = require('./middleware/accessPermissions');

const connectDB = require('./utils/connectDB');
connectDB();

const app = express();

app.use(express.static('build'));
app.use(express.json());
app.use(cors());

app.use(tokenExtractor);
if (process.env.NODE_ENV !== 'test') {
  app.use(postLog('log'));
  app.use(accessPermissions());
}

app.get('/', (req, res) => {
  res.send('<h1>服务器启动成功!</h1>');
});

app.use('/api/v1/admin/items', require('./controllers/items'));
app.use('/api/v1/admin/users', require('./controllers/users'));
app.use('/api/v1/admin/login', require('./controllers/login'));
// 废弃、改用 websocket
// app.use('/api/v1/admin/server_load', require('./controllers/serverLoad'));

app.use(require('./middleware/notFound'));
app.use(require('./middleware/errorHandler'));

module.exports = app;
