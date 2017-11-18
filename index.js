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
const success = require('./lib/success')
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
  options.errorMessages = options.errorMessages || {};
  options.saltRounds = function() { return config.saltRounds || 16 } ;
  options.tokenExpire = function() { return config.tokenExpire || { expiresIn: '1h' } };
  options.jwtSecret = function() { return config.jwtSecret };
  options.passwordValidator = options.passwordValidator || function(password, callback) { callback(null); };
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
    if (err) {
    return callback(err); }
    b.salt(password, options.saltRounds(), (err, salt) => {
      if (err) { console.log(err);
        return callback(err); }
      self.set(options.passwordField, salt);
      callback(null, self);
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
schema.statics.login = function (user, password, callback) {
  let self = this;
    self.findByUsername(user, function (err, foundUser) {
      if (err) { callback(setMessages(errors.incorrectUsername, 'error', 401)); }
      if (foundUser) {
        foundUser.comparePassword(password, function (error, validated) {
          if (!validated) {return callback(setMessages(errors.incorrectPassword, 'error', 401)); }
          j.issueToken(foundUser, options.jwtSecret(), options.tokenExpire(), (err, token) => {
            console.log(token);
            if (err) { callback(setMessages(errors.unknown, 'error', 400)); }
            console.log(foundUser);
            callback(null, token);
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
        console.log('attempting to set password');
        if (setPasswordErr) { return callback(setPasswordErr); }
        console.log(user);
        user.save((saveErr) => {
          if (saveErr) { return callback(saveErr); }
          console.log('saving user');
          callback(null, user);
        });
      });
    });
  };
  schema.statics.findByUsername = function(username, selectPasswordField, callback) {
    if (typeof callback === 'undefined') {
      callback = selectPasswordField;
      selectPasswordField = false;
    }
    if (username !== undefined) {
      username = username.toLowerCase();
    }
    var queryOrParameters = [];
    for (var i = 0; i < options.usernameQueryFields.length; i++) {
      var parameter = {};
      parameter[options.usernameQueryFields[i]] = username;
      queryOrParameters.push(parameter);
    }
    var query = options.findByUsername(this, { $or: queryOrParameters });

    if (callback) {
      query.exec(callback);
    } else {
      return query;
    }
  };
};
