const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Item = require('../models/item');
const User = require('../models/user');
const config = require('../utils/config');

router.get('/', async (req, res) => {
  if (!req.query.per && !req.query.page) {
    const items = await Item.find({}).populate('user');
    return res.json(items);
  }

  let per = req.query.per || 10; //每一页的数量
  let page = req.query.page || 1; // 页数

  if (page <= 0) {
    page = 1;
  }
  if (per <= 0) {
    per = 10;
  }

  const totalCount = await Item.find({}).countDocuments();
  const items = await Item.find({})
    .populate('user')
    .sort({ createdAt: -1 })
    .limit(Number(per))
    .skip(per * (page - 1));
  res.json({
    totalCount,
    // pages: Math.ceil(totalCount / per),
    list: items,
  });
});

router.get('/:id', async (req, res) => {
  const item = await Item.findById(req.params.id).populate('user');
  item ? res.json(item) : res.status(404).end();
});

router.post('/', async (req, res) => {
  const body = req.body;
  const token = req.token;

  const decodedToken = jwt.verify(token, config.SECRET);
  if (!token || !decodedToken.id) {
    return res.status(401).json({ error: '无效 token' });
  }
  const user = await User.findById(decodedToken.id);

  const item = new Item({ ...body, user: user._id });
  const savedItem = await item.save();

  user.items = user.items.concat(savedItem._id);
  await user.save();

  res.json(savedItem);
});

router.delete('/:id', async (req, res) => {
  await Item.findByIdAndRemove(req.params.id);
  res.status(204).end();
});

router.put('/:id', async (req, res) => {
  const body = req.body;

  const item = { ...body };
  const updatedNote = await Item.findByIdAndUpdate(req.params.id, item, {
    upsert: false,
    new: true,
    runValidators: true,
  });

  updatedNote ? res.json(updatedNote) : res.status(404).end();
});

module.exports = router;
