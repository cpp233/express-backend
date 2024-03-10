const { expressjwt: jwt } = require('express-jwt');
const config = require('../utils/config');

const accessPermissions = () => {
  return jwt({
    secret: config.SECRET,
    algorithms: ['HS256'],
  }).unless({
    path: [
      new RegExp('^/$'),
      new RegExp('^/register$'),
      new RegExp('^/login$'),
      new RegExp('/api/v1/admin/users*'),
      new RegExp('/api/v1/admin/login*'),
      new RegExp('/api/v1/debug*'),
    ],
  });
};

module.exports = accessPermissions;
