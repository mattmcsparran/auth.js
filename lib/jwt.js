'use strict';

const jwt = require('jsonwebtoken');
const j = {};

j.issueToken = (user, secret, expire, callback) => {
    jwt.sign({ user }, secret, expire, function (err, token) {
        if (err) { return callback(err); }
        callback(null, token);
    });
};
j.verifyToken = (token, secret, callback) => {
    jwt.verify(token, secret, (err, decoded) => {
        if (err) { return callback(err); }
        callback(null, decoded);
    });
};


module.exports = j;
