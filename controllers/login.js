const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = require('express').Router();
const User = require('../models/user');
const config = require('../utils/config');

router.post('/', async (request, response) => {
  const body = request.body;

  const user = await User.findOne({ username: body.username });
  const passwordCorrect =
    user === null
      ? false
      : await bcrypt.compare(body.password, user.passwordHash);

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: '用户名或密码错误',
    });
  }

  const userForToken = {
    username: user.username,
    id: user._id,
  };

  const token = jwt.sign(userForToken, config.SECRET, { expiresIn: '24h' });

  response.status(200).send({
    token,
    username: user.username,
    name: user.name,
    expires: 24 * 60 * 60 * 1000,
  });
});

module.exports = router;
