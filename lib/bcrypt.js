'use strict';

const bcrypt = require('bcrypt');
const b = {};

b.salt = (password, saltRounds, callback) => {
    bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) { return callback(err); }
        bcrypt.hash(password, salt, (error, hash) => {
            if (error) { return callback(error); }
            return callback(null, hash);
        });
    });
};
b.validate = (suppliedPassword, storedPassword, callback) => {
    bcrypt.compare(suppliedPassword, storedPassword, (err, isMatch) => {
        if (err) { return callback(err); }
        return callback(null, isMatch);
    });
};
module.exports = b;
