const User = require('../models/user');

const nonExistingId = async () => {
  const user = new User({ username: '无效id' });
  await user.save();
  // await user.remove();
  await user.deleteOne(user._id);

  return user._id.toString();
};

const usersInDb = async () => {
  const users = await User.find({});
  return users.map(u => u.toJSON());
};

module.exports = {
  nonExistingId,
  usersInDb,
};
