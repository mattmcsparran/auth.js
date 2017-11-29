/*
 * easy-api-auth
 * Copyright(c) 2017 Matthew McSparran
 * MIT Licensed
 */
// Module Dependencies
const _ = require('lodash');
const mongoose = require('mongoose');
const debug = require('debug');
// Module Scripts
const config = require('./lib/config');
const b = require('./lib/bcrypt');
const j = require('./lib/jwt');
const messages = require('./lib/messages');
const errors = require('./lib/errors');
const success = require('./lib/success');
// Configuration
setMessages = (body, type, code) => {
  messages.body = body;
  messages.type = type;
  messages.code = code;
  return messages;
}
module.exports = function(schema, options) {
  options = options || {};
  options.usernameField = options.usernameField || 'username';
  options.usernameLowerCase = options.usernameLowerCase || false;
  options.findByUsername = options.findByUsername || function(model, queryParameters) { return model.findOne(queryParameters); }
  options.passwordField = options.passwordField || 'password';
  options.saltRounds = function() { return config.saltRounds || 16 } ;
  options.tokenExpire = function() { return config.tokenExpire || { expiresIn: '1h' } };
  options.jwtSecret = function() { return config.jwtSecret || 'You should not be using this for your secret. it is really dumb. Please use a different secret' };
  options.passwordValidator = options.passwordValidator || function(password, callback) { callback(null); };
  options.lastLoginField = options.lastLoginField || 'lastLogin';
  if (options.usernameQueryFields) {
    options.usernameQueryFields.push(options.usernameField);
  } else {
    options.usernameQueryFields = [options.usernameField];
  }
schema.set('toJSON', {
   transform: (doc, ret, options) => {
    delete ret.password;
    return ret;
    }
  });
schema.pre('save', function(next) {
      if (options.usernameLowerCase && this[options.usernameField]) {
        this[options.usernameField] = this[options.usernameField].toLowerCase();
      }
      next();
    });
schema.methods.setPassword = function (password, callback) {
  if (!password) {
    return callback(setMessages(errors.missingPassword, 'error', 406));
  }
  let self = this;
  options.passwordValidator(password, (err) => {
    if (err) { return callback(err); }
    b.salt(password, options.saltRounds(), (err, salt) => {
      if (err) { return callback(err); }
      self.set(options.passwordField, salt);
      return callback(null, self);
    });
  });
};
schema.methods.comparePassword = function (password, callback) {
  let self = this;
  b.validate(password, self.password, function(err, validated) {
    if(!validated) {
      return callback(setMessages(errors.incorrectPassword, 'error', 401));
    }
      return callback(null, validated);
  });
};
schema.methods.setLastLogin = function () {
  let self = this;
  self.set(options.lastLoginField, Date.now());
  self.save((err) => {
    if (err) {
      return err;
    }
  });
}
schema.statics.login = function (user, password, callback) {
  let self = this;
    self.findByUsername(user, function (err, foundUser) {
      if (err) { callback(setMessages(errors.incorrectUsername, 'error', 401)); }
      if (foundUser) {
        foundUser.comparePassword(password, function (error, validated) {
          if (!validated) {return callback(setMessages(errors.incorrectPassword, 'error', 401)); }
          j.issueToken(foundUser, options.jwtSecret(), options.tokenExpire(), (err, token) => {
            if (err) { return callback(setMessages(errors.unknown, 'error', 400)); }
            foundUser.setLastLogin();
            return callback(null, token, setMessages(success.loggedIn, 'success', 200));
          });
        });
      }
    });
  };
schema.statics.register = function (user, password, callback) {
  if (!(user instanceof this)) {
        user = new this(user);
      }
      if (!user.get(options.usernameField)) {
        return callback(setMessages(errors.missingUsername, 'error', 406));
      }
    let self = this;
    self.findByUsername(user.get(options.usernameField), true, function(err, existingUser) {
      if (err) { return callback(setMessages(errors.unknown, 'error', 400)); }
      if (existingUser) {
        return callback(setMessages(errors.userExists, 'error', 409));
      }
      user.setPassword(password, (setPasswordErr, user) => {
        if (setPasswordErr) { return callback(setPasswordErr); }
        user.save((saveErr) => {
          if (saveErr) { return callback(saveErr); }
          return callback(null, user, setMessages(success.createdAccount, 'success', 200));
        });
      });
    });
  };
schema.statics.findByUsername = function(username, selectPassword, callback) {
    if (typeof callback === 'undefined') {
      callback = selectPassword;
      selectPassword = false;
    }
    if (username !== undefined) {
      username = username.toLowerCase();
    }
    let queryOrParameters = [];
    for (var i = 0; i < options.usernameQueryFields.length; i++) {
      var parameter = {};
      parameter[options.usernameQueryFields[i]] = username;
      queryOrParameters.push(parameter);
    }
    const query = options.findByUsername(this, { $or: queryOrParameters });
    if (callback) {
      query.exec(callback);
    } else {
      return query;
    }
  };
};
