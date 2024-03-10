const cors = require('cors');
const express = require('express');
const config = require('./utils/config');

const app = express();

app.use(cors());

const dir = config.WEB_DIR;
app.use(express.static(dir));

app.get('*', (req, res) => {
  // res.sendFile(path.join(__dirname + '/public/index.html'));
  res.sendFile(`${dir}/index.html`);
});

module.exports = app;
