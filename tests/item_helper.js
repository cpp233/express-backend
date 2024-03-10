const jwt = require('jsonwebtoken');
const Item = require('../models/item');
const User = require('../models/user');
const config = require('../utils/config');

const initItems = [];
for (let i = 0; i < 50; i++) {
  initItems.push({
    name: 'item' + i,
    quantity: 10 + i,
    content: '测试用item' + i,
    isShow: Math.random() > 0.5 ? true : false,
  });
}

const nonExistingId = async () => {
  const item = new Item({ name: '无效id' });
  await item.save();
  // await item.remove();
  await item.deleteOne(item._id);

  return item._id.toString();
};

const itemsInDB = async () => {
  const items = await Item.find({});
  return items.map(item => item.toJSON());
};

const getToken = async () => {
  const user = await User.findOne({ username: 'root' });
  const userForToken = {
    username: user.username,
    id: user._id,
  };
  const token = jwt.sign(userForToken, config.SECRET, { expiresIn: '24h' });
  return 'bearer ' + token;
};

module.exports = {
  initItems,
  nonExistingId,
  itemsInDB,
  getToken,
};
