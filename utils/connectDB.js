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
  logger.info('开始连接数据库：', url);
  try {
    const result = await mongoose.connect(url, {
       useNewUrlParser: true,
       useUnifiedTopology: true,
      // useFindAndModify: false,
      // useCreateIndex: true,
    });
    logger.info('连接数据库成功！');
    logger.info('models:', Object.keys(result.models));

    if (process.env.NODE_ENV !== 'test') {
      // 初始一个默认用户
      const filter = { username: 'root' };
      const passwordHash = await bcrypt.hash('123456', 10);
      const update = { username: 'root', passwordHash };
      await User.findOneAndUpdate(filter, update, {
        upsert: true,
      });
    }
  } catch (error) {
    logger.info('连接数据库失败：', error.message);
  }
};

module.exports = connectDB;
