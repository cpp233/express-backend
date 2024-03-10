const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const api = supertest(app);
const User = require('../models/user');
const { connectDB } = require('../utils/connectDB');

const REST_API_V1 = '/api/v1/admin/login';

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

describe('登陆：', () => {
  test('登陆：有效用户', async () => {
    const validUser = {
      username: 'root',
      password: '123456',
    };

    const result = await api
      .post(REST_API_V1)
      .send(validUser)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toMatchObject({
      username: validUser.username,
      token: expect.stringMatching(/^.{195}$/),
    });
  });

  test('登陆：无效用户', async () => {
    const validUser = {
      username: 'rootuser',
      password: '123456',
    };

    const result = await api
      .post(REST_API_V1)
      .send(validUser)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toMatchObject({
      error: expect.stringMatching(/用户名或密码错误/),
    });
  });

  test('登陆：错误密码用户', async () => {
    const validUser = {
      username: 'root',
      password: '654321',
    };

    const result = await api
      .post(REST_API_V1)
      .send(validUser)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    expect(result.body).toMatchObject({
      error: expect.stringMatching(/用户名或密码错误/),
    });
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    await mongoose.connection.close();
  }
});
