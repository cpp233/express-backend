const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const api = supertest(app);
const Item = require('../models/item');
const User = require('../models/user');
const helper = require('./item_helper');
const { connectDB } = require('../utils/connectDB');

const REST_API_V1 = '/api/v1/admin/items';

beforeAll(async () => {
  if (mongoose.connection.readyState === mongoose.STATES.disconnected) {
    await connectDB();

    // const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    // const info = await admin.buildInfo();
    // console.log(`mongodb: ${info.version}`);
    // console.log(`mongoose: ${mongoose.version}`);
  }
});

beforeEach(async () => {
  await Item.deleteMany({});
  await User.deleteMany({});
  const passwordHash = await bcrypt.hash('123456', 10);
  const user = new User({ username: 'root', passwordHash });
  await user.save();

  const promiseArray = helper.initItems
    .map(item => new Item(item))
    .map(item => item.save());

  await Promise.all(promiseArray);
}, 1000 * 10);

describe('一般查找：', () => {
  test('查找：所有数据', async () => {
    const itemsAtStart = await helper.itemsInDB();

    const result = await api
      .get(REST_API_V1)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const processedItemsAtStart = JSON.parse(JSON.stringify(itemsAtStart));
    expect(result.body).toEqual(processedItemsAtStart);
  });

  test('查找：单个数据', async () => {
    const itemsAtStart = await helper.itemsInDB();
    const itemsToFind = itemsAtStart[0];

    const result = await api
      .get(REST_API_V1 + `/${itemsToFind.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const processeditemsToFind = JSON.parse(JSON.stringify(itemsToFind));
    expect(result.body).toEqual(processeditemsToFind);
  });

  test('查找：id 不存在数据', async () => {
    const nonExistingId = await helper.nonExistingId();

    await api.get(REST_API_V1 + `/${nonExistingId}`).expect(404);
  });

  test('查找：id 格式错误数据', async () => {
    const result = await api
      .get(REST_API_V1 + '/id')
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toEqual({ error: '错误格式的ID' });
  });
});

describe('分页查找', () => {
  test('查找：按十页分页', async () => {
    const result = await api
      .get(REST_API_V1 + '?page=3&per=10')
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(result.body.list).toHaveLength(10);
  });
});

describe('新增：', () => {
  test('新增：有效数据', async () => {
    const validItem = {
      name: '有效数据',
      content: '有效数据',
    };
    const token = await helper.getToken();

    await api
      .post(REST_API_V1)
      .send(validItem)
      .set('Authorization', token)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const itemsAtEnd = await helper.itemsInDB();
    expect(itemsAtEnd).toHaveLength(helper.initItems.length + 1);
    const names = itemsAtEnd.map(p => p.name);
    expect(names).toContain('有效数据');
  });

  test('新增：无效数据', async () => {
    const invalidItem = {
      // name: '无效数据',
      content: '无效数据缺name',
    };
    const token = await helper.getToken();

    await api
      .post(REST_API_V1)
      .send(invalidItem)
      .set('Authorization', token)
      .expect(400);

    const itemsAtEnd = await helper.itemsInDB();
    expect(itemsAtEnd).toHaveLength(helper.initItems.length);
  });

  test('新增：携带无效token数据', async () => {
    const invalidItem = {
      name: '无效token数据',
      content: '无效token数据',
    };

    const result = await api
      .post(REST_API_V1)
      .send(invalidItem)
      .set('Authorization', 'token')
      .expect(401);

    const itemsAtEnd = await helper.itemsInDB();
    expect(itemsAtEnd).toHaveLength(helper.initItems.length);
    expect(result.body).toMatchObject({
      error: expect.stringMatching(/无效 token/),
    });
  });
});

describe('删除：', () => {
  test('删除：单个数据', async () => {
    const itemsAtStart = await helper.itemsInDB();
    const itemToDelete = itemsAtStart[0];

    const token = await helper.getToken();

    await api
      .delete(REST_API_V1 + `/${itemToDelete.id}`)
      .set('Authorization', token)
      .expect(204);

    const itemsAtEnd = await helper.itemsInDB();
    expect(itemsAtEnd).toHaveLength(helper.initItems.length - 1);

    const names = itemsAtEnd.map(r => r.name);
    expect(names).not.toContain(itemToDelete.name);
  });

  test('删除：id 格式错误数据', async () => {
    const token = await helper.getToken();

    const result = await api
      .delete(REST_API_V1 + '/id')
      .set('Authorization', token)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toEqual({ error: '错误格式的ID' });
  });
});

describe('更新', () => {
  test('更新：单个数据', async () => {
    const itemsAtStart = await helper.itemsInDB();
    const itemToUpdate = itemsAtStart[0];

    const validItem = { name: '更新数据' };

    const result = await api
      .put(REST_API_V1 + `/${itemToUpdate.id}`)
      .send(validItem)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toMatchObject(validItem);

    const itemsAtEnd = await helper.itemsInDB();

    const names = itemsAtEnd.map(p => p.name);
    expect(names).toContain(validItem.name);
  });

  test('更新：无效数据', async () => {
    const itemsAtStart = await helper.itemsInDB();
    const itemToUpdate = itemsAtStart[0];

    const invalidItem = { name: '1' };

    const result = await api
      .put(REST_API_V1 + `/${itemToUpdate.id}`)
      .send(invalidItem)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toMatchObject({
      error: expect.stringMatching(/short/),
    });
  });

  test('更新：id 不存在数据', async () => {
    const nonExistingId = await helper.nonExistingId();

    const validItem = { name: 'id 不存在数据' };

    await api
      .put(REST_API_V1 + `/${nonExistingId}`)
      .send(validItem)
      .expect(404);
  });

  test('更新：id 格式错误数据', async () => {
    const validItem = { name: 'id 格式错误数据' };

    const result = await api
      .put(REST_API_V1 + '/id')
      .send(validItem)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toMatchObject({
      error: expect.stringMatching(/错误格式的ID/),
    });
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    await mongoose.connection.close();
  }
});
