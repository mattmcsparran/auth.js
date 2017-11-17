const jwt = require('jsonwebtoken');
let j = {};

  j.issueToken = (user, secret, expire, callback) => {
    jwt.sign({ user: user }, secret, expire, function(err, token) {
      callback(null, token)
    });
  }
  j.verifyToken = (user, token, secret, callback) => {

  }


module.exports = j;
