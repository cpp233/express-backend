const router = require('express').Router();
const Tag = require('../models/tag');

router.get('/', async (request, response) => {
  const tags = await Tag.find().select('name');
  response.json(tags);
});

router.get('/:id', async (request, response) => {
  const tag = await Tag.findById(request.params.id).select('name');
  tag ? response.json(tag) : response.status(404).end();
});

// 下面的不使用，通过 item 控制新增删除
// router.post('/', async (request, response) => {
//   const body = request.body;

//   const tag = new Tag({
//     name: body.name,
//   });

//   const savedTag = await tag.save();

//   response.json(savedTag);
// });

module.exports = router;
