const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const api = supertest(app);
const User = require('../models/user');
const helper = require('./user_helper');
const { connectDB } = require('../utils/connectDB');

const REST_API_V1 = '/api/v1/admin/users';

beforeAll(async () => {
  if (mongoose.connection.readyState === mongoose.STATES.disconnected) {
    await connectDB();
  }
});

beforeEach(async () => {
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash('123456', 10);
  const user = new User({ username: 'root', passwordHash });

  await user.save();
});

describe('查找：', () => {
  test('查找：所有用户', async () => {
    const usersAtStart = await helper.usersInDb();

    const result = await api
      .get(REST_API_V1)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const processedUsersAtStart = JSON.parse(JSON.stringify(usersAtStart));
    expect(result.body).toEqual(processedUsersAtStart);
  });

  test('查找：单个用户', async () => {
    const usersAtStart = await helper.usersInDb();
    const userToFind = usersAtStart[0];

    const result = await api
      .get(REST_API_V1 + `/${userToFind.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const processedUsersToFind = JSON.parse(JSON.stringify(userToFind));
    expect(result.body).toEqual(processedUsersToFind);
  });

  test('查找：id 不存在用户', async () => {
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

describe('新增：', () => {
  test('新增：有效用户', async () => {
    const usersAtStart = await helper.usersInDb();

    const validUser = {
      username: 'uuu',
      name: '有效用户',
      password: '123456',
    };

    await api
      .post(REST_API_V1)
      .send(validUser)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

    const usernames = usersAtEnd.map(u => u.username);
    expect(usernames).toContain(validUser.username);
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    await mongoose.connection.close();
  }
});
