// 废弃、改用 ws 服务器主动轮询
const router = require('express').Router();
const { getCpusUse, getMemoryUse } = require('../utils/systeminfo');

router.get('/', async (request, response) => {
  const cpuUse = await getCpusUse();
  const memoryUse = await getMemoryUse();
  response
    .status(200)
    .send({ cpuUse: { ...cpuUse }, memoryUse: { ...memoryUse } });
});

module.exports = router;
