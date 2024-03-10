const logger = require('../utils/logger');

const errorHandler = (error, request, response, next) => {
  logger.error('errorHandler.locals:', [Reflect.ownKeys(response.locals)]);
  if (response.locals.session) {
    const session = response.locals.session;
    session.abortTransaction();
    // session.endSession();
    logger.info('abortTransaction');
  }

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    // logger.error('errorHandler:', [Reflect.ownKeys(error), error]);

    return response.status(400).send({ error: '错误格式的ID' });
  } else if (error.type === 'entity.parse.failed') {
    return response.status(400).send({ error: 'JSON 解析失败' });
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message });
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({
      error: '无效 token',
    });
  } else if (error.name === 'UnauthorizedError') {
    return response.status(401).json({
      error: '无权访问',
    });
  }

  logger.error('errorHandler:', [Reflect.ownKeys(error)]);
  next(error);
};

module.exports = errorHandler;
