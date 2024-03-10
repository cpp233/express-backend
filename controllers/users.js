const bcrypt = require('bcryptjs');
const router = require('express').Router();
const User = require('../models/user');

router.get('/', async (request, response) => {
  const users = await User.find({}).populate('items');
  response.json(users);
});

router.get('/:id', async (request, response) => {
  const users = await User.findById(request.params.id).populate('items');
  users ? response.json(users) : response.status(404).end();
});

router.post('/', async (request, response) => {
  const body = request.body;

  // mongoose-unique-validator 插件新版本修改了 api
  // 手动控制 unique
  // const existingUser = await User.findOne({ username: body.username });
  // if (existingUser) {
  //   return response.status(400).json({
  //     error: '用户名不能重复',
  //   });
  // }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(body.password, saltRounds);

  const user = new User({
    username: body.username,
    // name: body.name,
    passwordHash,
  });

  const savedUser = await user.save();

  response.json(savedUser);
});

module.exports = router;
