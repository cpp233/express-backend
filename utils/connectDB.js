const { red, green, bold } = require('chalk');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/user');
const config = require('./config');
const logger = require('./logger');

// 测试模式单独调试用，弃用
if (process.env.NODE_ENV === 'test' && 0) {
  const db = mongoose.connection;
  db.on('connecting', () => {
    console.log('正在连接……');
  });
  db.on('disconnecting', () => {
    console.log('正在断开连接……');
  });
  db.on('connected', () => {
    console.log('连接成功');
  });
  db.on('disconnected', () => {
    // console.log('断开成功');
  });
}

const connectDB = async () => {
  const url = config.MONGODB_URI;
  logger.info(`The database address is:${url}`);
  logger.info('Wait for the database connection to complete.');

  try {
    const result = await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useFindAndModify: false,
      // useCreateIndex: true,
    });
    logger.info(`Connected to the database ${green('successfully')}!`);
    logger.info('Database Models:', Object.keys(result.models));

    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const info = await admin.buildInfo();
    logger.info(`mongodb version: ${info.version}`);
    logger.info(`mongoose version: ${mongoose.version}`);

    if (process.env.NODE_ENV !== 'test') {
      // 初始一个默认用户
      const filter = { username: 'root' };
      const passwordHash = await bcrypt.hash('123456', 10);
      const update = { username: 'root', passwordHash };
      await User.findOneAndUpdate(filter, update, {
        upsert: true,
      });
    }

    return true;
  } catch (error) {
    logger.info(`${red('Failed')} to connect to database:`, error.message);

    return false;
  }
};

// const session = await mongoose.connection.startSession();
// const session = await mongoose.startSession();
const connectSession = 1;

module.exports = { connectDB, connectSession };
