const notFound = (req, res) => {
  res.status(404).send({ error: 'Not Found' });
};

module.exports = notFound;
