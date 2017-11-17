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
const jwt = require('./lib/jwt');
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
  options.saltRounds = config.saltRounds();
  options.tokenExpire = config.tokenExpire();
  options.bcryptSecret = config.bcryptSecret();
  options.jwtSecret = config.jwtSecret();

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
    console.log('checking for password');
  if (!password) {
    return callback(setMessages(errors.missingPassword, 'error', 406));
  }
  let self = this;
  options.passwordValidator(password, (err) => {
    console.log(password);
    console.log('validating password');
    if (err) {
    return callback(err); }
    b.salt(password, options.saltRounds, (err, salt) => {
      console.log('hashing password');
      if (err) { console.log(err);
        return callback(err); }
      console.log(salt);
      self.set(options.passwordField, salt);
      callback(null, self);
    });
  });
};
schema.methods.comparePassword = (password, callback) => {
  let self = this;
  b.validate(password, self.password, (err, validated) => {
    if(!validated || err) {
      return callback(setMessages(errors.incorrectPassword, 'error', 401));
    }
      return callback(validated);
  });

};
schema.methods.changePassword = function(oldPassword, newPassword, callback) {
  if (!oldPassword || !newPassword) {
    return callback(new errors.MissingPasswordError(options.errorMessages.MissingPasswordError));
  }

  var self = this;

  this.authenticate(oldPassword, function(err, authenticated) {
    if (err) { return callback(err); }

    if (!authenticated) {
      return callback(new errors.IncorrectPasswordError(options.errorMessages.IncorrectPasswordError));
    }

    self.setPassword(newPassword, function(setPasswordErr, user) {
      if (setPasswordErr) { return callback(setPasswordErr); }

      self.save(function(saveErr) {
        if (saveErr) { return callback(saveErr); }

        callback(null, user);
      });
    });
  });
};
schema.statics.login = (user, password, callback) => {
  let self = this;
    self.findByUsername(user, (err, foundUser) => {
      if (err) { callback(setMessages(errors.incorrectUsername, 'error', 401)); }
      if (foundUser) {
        self.comparePassword(password, (error, validated) => {
          if (!validated) {return callback(setMessages(errors.incorrectPassword, 'error', 401)); }
          jwt.issueToken(foundUser, config.jwtSecret, config.tokenExpire, (err, token) => {
            if (err) { callback(setMessages(errors.unknown, 'error', 400)); }
            callback(null, token);
          });
        });
      }
    });
}
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
  }
  schema.statics.findByUsername = function(username, selectPasswordField, callback) {
    if (typeof callback === 'undefined') {
      callback = selectPasswordField;
      selectPasswordField = false;
    }

    // if specified, convert the username to lowercase
    if (username !== undefined && options.usernameLowerCase) {
      username = username.toLowerCase();
    }

    // Add each username query field
    var queryOrParameters = [];
    for (var i = 0; i < options.usernameQueryFields.length; i++) {
      var parameter = {};
      parameter[options.usernameQueryFields[i]] = username;
      queryOrParameters.push(parameter);
    }

    var query = options.findByUsername(this, { $or: queryOrParameters });

    if (selectPasswordField) {
      query.select('+' + options.passwordField);
    }

    if (options.selectFields) {
      query.select(options.selectFields);
    }

    if (options.populateFields) {
      query.populate(options.populateFields);
    }

    if (callback) {
      query.exec(callback);
    } else {
      return query;
    }
  };
}
