require('express-async-errors');
const cors = require('cors');
const express = require('express');

const postLog = require('./middleware/postLog');
const tokenExtractor = require('./middleware/tokenExtractor');
const accessPermissions = require('./middleware/accessPermissions');
const memoryCacheConfig = require('./middleware/memCache');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const itemsRouter = require('./controllers/items');
const tagsRouter = require('./controllers/tags');
const usersRouter = require('./controllers/users');
const loginRouter = require('./controllers/login');

const app = express();

// app.use(express.static('build'));

app.use(express.json());
app.use(cors());

app.use(tokenExtractor);
if (process.env.NODE_ENV !== 'test') {
  app.use(postLog('log'));
  app.use(accessPermissions());
  app.use(memoryCacheConfig());
}

app.get('/', (req, res) => {
  res.send('<h1>服务器启动成功!</h1>');
});

app.use('/api/v1/admin/items', itemsRouter);
app.use('/api/v1/admin/tags', tagsRouter);
app.use('/api/v1/admin/users', usersRouter);
app.use('/api/v1/admin/login', loginRouter);
// 废弃、改用 websocket
// app.use('/api/v1/admin/server_load', require('./controllers/serverLoad'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
