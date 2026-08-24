function asyncWrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = { asyncWrap, errorHandler };
