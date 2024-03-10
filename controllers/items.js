const router = require('express').Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Item = require('../models/item');
const User = require('../models/user');
const Tag = require('../models/tag');
const config = require('../utils/config');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  // 无分页返回所有数据
  if (!req.query.per && !req.query.page) {
    const items = await Item.find({})
      .populate('user')
      .populate({ path: 'tagList2', select: 'name' });
    return res.json(items);
  }

  let per = req.query.per || 10; //每一页的数量
  let page = req.query.page || 1; // 页数
  let keyword = req.query.keyword || '';

  if (page <= 0) {
    page = 1;
  }
  if (per <= 0) {
    per = 10;
  }

  let totalCount = 0;
  let items = [];

  // 搜索为空，返回带页数数据
  if (keyword === '') {
    items = await Item.find({})
      .populate('user')
      .populate({ path: 'tagList2', select: 'name' })
      .sort({ createdAt: -1 })
      .limit(Number(per))
      .skip(per * (page - 1));
    totalCount = await Item.find({}).countDocuments();

    return res.json({
      totalCount,
      // pages: Math.ceil(totalCount / per),
      list: items,
    });
  }

  // 返回带搜索关键字和页数的数据
  const searchRegex = new RegExp(keyword, 'i');
  const findTagList = await Tag.find({ name: { $regex: searchRegex } });
  // logger.info('findTagList', findTagList);
  // 返回搜索数据
  const query = {
    $or: [
      { name: { $regex: searchRegex } },
      // { quantity: { $toString: searchRegex } },
      // { $addFields: { quantity: { $toString: '$quantityN' } } },
      // { quantityN: { $regex: searchRegex } },
      { content: { $regex: searchRegex } },
      { tagList: { $regex: searchRegex } },
      {
        tagList2: {
          $in: findTagList,
        },
        // 'tagList2.name': keyword,
        // 'tagList2.name': { $regex: searchRegex },
      },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: '$quantity' },
            regex: keyword,
          },
        },
      },
    ],
    // $where: function () {
    //   return this.quantity.toString().match(searchRegex) !== null;
    // },
  };

  items = await Item.find(query)
    .populate('user')
    .populate({ path: 'tagList2', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(Number(per))
    .skip(per * (page - 1));
  totalCount = await Item.find(query).countDocuments();

  return res.json({
    totalCount,
    // pages: Math.ceil(totalCount / per),
    list: items,
  });
});

router.get('/:id', async (req, res) => {
  // console.log('item get:', req.params.id);
  logger.info('item get:', req.params.id);
  const item = await Item.findById(req.params.id)
    .populate('user')
    .populate({ path: 'tagList2', select: 'name' });

  // etag: W/"98c-VDfoNMkyUI8XjziuqIWTIX4XSbU"
  // res.setHeader('Cache-Control', 'public, max-age=10');
  // res.setHeader('Cache-Control', 'no-cache');

  item ? res.json(item) : res.status(404).end();
});

router.post('/', async (req, res) => {
  const body = req.body;
  const token = req.token;

  // const session = await mongoose.connection.startSession();
  const session = await mongoose.startSession();
  res.locals.session = session;

  // 一般形式
  session.startTransaction();
  // 回调函数为参数的形式
  // await session.withTransaction(() => {
  //   const newItem1 = new Item({ ...body, user: null, tagList2: null });
  //   return newItem1.save({ session });
  // });

  // 获得其他表-用户
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!token || !decodedToken.id) {
    return res.status(401).json({ error: '无效 token' });
  }
  const user = await User.findById(decodedToken.id, null, { session });
  // logger.info(util.inspect(user, false, null, true));

  // 获得其他表-标签
  const { tagList2, ...other } = body;
  const newItem = new Item({ ...other, user: user._id });
  if (tagList2 && Array.isArray(tagList2)) {
    // 批量更新插入
    const operaList = tagList2?.map(tag => {
      return {
        updateOne: {
          filter: { name: tag },
          // update: { name: tag, items: [newItem._id] },
          update: {
            $set: {
              name: tag,
            },
            $push: { items: newItem._id },
          },
          upsert: true,
          new: true,
          runValidators: true,
        },
      };
    });
    const bulkWriteResult1 = await Tag.bulkWrite(operaList, { session });

    // logger.info(operaList, bulkWriteResult1);
  }

  const savedTagList = await Tag.find({ name: { $in: tagList2 } }, null, {
    session,
  });
  if (savedTagList.length !== 0) {
    // const item = new Item({ ...other, user: user._id, tagList2: savedTagList });
    newItem.tagList2 = savedTagList.map(tag => tag._id);

    // logger.info('post:', { savedTagList, newItem });
  }
  const savedItem = await newItem.save({ session });

  // 更新另外的表-user
  user.items = user.items.concat(savedItem._id);
  await user.save({ session });

  // 更新另外的表-tag
  // for (let i = 0; i < savedTagList.length; i++) {
  //   savedTagList[i].items = savedTagList[i].items.concat(savedItem._id);
  //   await savedTagList[i].save();
  // }

  await session.commitTransaction();
  session.endSession();

  const result = await savedItem.populate({ path: 'tagList2', select: 'name' });

  res.json(result);
});

// 批量删除
router.delete('/', async (req, res) => {
  const idList = req.query?.idList.split(',');

  if (!idList) {
    return res.status(204).end();
  }

  const session = await mongoose.startSession();
  res.locals.session = session;
  session.startTransaction();

  const token = req.token;
  const itemId = req.params.id;
  // 获得其他表用户
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!token || !decodedToken.id) {
    return res.status(401).json({ error: '无效 token' });
  }

  // 其他表同步-user
  const user = await User.findById(decodedToken.id, null, { session });
  await user.updateOne({ $pull: { items: { $in: idList } } }, { session });

  // 其他表同步-tag
  await Tag.updateMany(
    { items: { $in: idList } },
    { $pull: { items: { $in: idList } } },
    {
      session,
    }
  );
  await Tag.deleteMany({ items: [] }, { session });

  // logger.info('delete.query:', idList);
  await Item.deleteMany({ _id: { $in: idList } }, { session });

  await session.commitTransaction();
  session.endSession();

  res.status(204).end();
});

// 单个删除
router.delete('/:id', async (req, res) => {
  const token = req.token;
  const itemId = req.params.id;

  const session = await mongoose.startSession();
  res.locals.session = session;
  session.startTransaction();

  // 获得其他表用户
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!token || !decodedToken.id) {
    return res.status(401).json({ error: '无效 token' });
  }
  // await Item.findByIdAndRemove(itemId);

  // 其他表同步-user
  const user = await User.findById(decodedToken.id, null, { session });
  await user.updateOne({ $pull: { items: itemId } }, { session });

  // 其他表同步-tag
  const item = await Item.findById(itemId, null, { session }).populate(
    'tagList2'
  );

  const tagList2 = item.tagList2;
  if (tagList2) {
    const operaList = item.tagList2?.map(tag => {
      return {
        updateOne: {
          filter: { name: tag.name },
          update: { $pull: { items: item._id } },
        },
      };
    });
    const bulkWriteResult1 = await Tag.bulkWrite(operaList, { session });
    logger.info(item, operaList, bulkWriteResult1);
  }

  // 删除 tag 中空引用
  await Tag.deleteMany({ items: [] }, { session });

  // 删除 item
  await Item.findByIdAndRemove(itemId, { session });

  // 删除所有空引用
  // const itemList = user.items;
  // for (let i = 0; i < itemList.length; i++) {
  //   const item = await Item.findById(itemList[i]);
  //   if (!item) {
  //     await user.updateOne({ $pull: { items: itemList[i] } });
  //   }
  // }

  await session.commitTransaction();
  session.endSession();

  res.status(204).end();
});

router.put('/:id', async (req, res) => {
  const body = req.body;
  const id = req.params.id;

  const session = await mongoose.startSession();
  res.locals.session = session;
  session.startTransaction();

  const item = { ...body };

  // 其他表同步-user
  // 用户自己编辑的，不改

  // 其他表同步-tag
  const { tagList2, ...other } = item;

  // 插入新增的 tagList2
  if (tagList2 && Array.isArray(tagList2)) {
    const operaList = tagList2.map(tag => {
      return {
        updateOne: {
          filter: { name: tag },
          update: {
            $set: {
              name: tag,
            },
            $addToSet: { items: id },
          },
          // 批量更新插入
          upsert: true,
        },
      };
    });
    const bulkWriteResult1 = await Tag.bulkWrite(operaList, { session });
    // logger.info(operaList, bulkWriteResult1);
  }

  if (tagList2) {
    // 更新 Tag ，移除不符合 item.tagList2 的
    await Tag.updateMany(
      { name: { $nin: tagList2 } },
      { $pull: { items: id } },
      { session }
    );
    // // 更新 Tag ，条件为符合 item.tagList2 的
    await Tag.updateMany(
      { name: { $in: tagList2 } },
      { $addToSet: { items: { $each: [id] } } },
      { session }
    );
    // 上面两个 updateMany 是否能合成一个语句

    // 删除 Tag 中items为空引用的 tag
    await Tag.deleteMany({ items: [] }, session);

    // await Tag.bulkWrite(
    //   [
    //     {
    //       updateMany: {
    //         name: { $nin: tagList2 },
    //         $pull: { items: id },
    //       },
    //     },
    //     {
    //       updateMany: {
    //         name: { $in: tagList2 },
    //         $addToSet: { items: { $each: [id] } },
    //       },
    //     },
    //     {
    //       deleteMany: { items: [] },
    //     },
    //   ],
    //   { session }
    // );
  }

  // const updatedNote = await Item.findByIdAndUpdate(id, item, {
  //   upsert: false,
  //   new: true,
  //   runValidators: true,
  // });
  const savedTagList = await Tag.find({ name: { $in: tagList2 } }, null, {
    session,
  });
  // logger.info(other, savedTagList);

  const updatedNote = await Item.findByIdAndUpdate(
    id,
    {
      $set: {
        ...other,
        ...(savedTagList.length > 0 && {
          tagList2: savedTagList.map(tag => tag._id),
        }),
      },
      // $addToSet: {
      //   tagList2: { $each: savedTagList.map(tag => tag._id) },
      // },
    },
    {
      upsert: false,
      new: true,
      runValidators: true,
      session,
    }
  );

  await session.commitTransaction();
  session.endSession();

  updatedNote ? res.json(updatedNote) : res.status(404).end();
});

module.exports = router;
