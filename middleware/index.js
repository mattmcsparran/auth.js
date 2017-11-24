const mongoose = require('mongoose');
const j = require('../lib/jwt');
const messages = require('../lib/messages');
const errors = require('../lib/errors');
const success = require('../lib/success');
const config = require('../lib/config');

secretToken = () => {
  return config.jwtSecret;
}
let middleware = {};

middleware.verify = (req, res, next) => {
  if (!req.headers.authorization) {
      return res.sendStatus(401);
      }
    j.verifyToken(req.headers.authorization, secretToken(), (err, verified) => {
      if (err) {
        return res.send(err).status(400);
      }
      req.user = verified.user;
      return next();
    });
}

middleware.isAdmin = (req, res, next) => {
  if (req.user) {
    res.locals.User.findById({_id: req.user._id}, (err, user) => {
      if (err) { return res.status(404).send(err); }
      if (user.role === 'admin') {
      return next();
      }
      return res.status(401).send('User not authorized');
    });
  }
}

module.exports = middleware;
