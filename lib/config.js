let config = {
  jwtSecret: '',
  tokenExpire: '',
  saltRounds: ''
};

 config.conf = function(secret, salt, expire) {
  config.jwtSecret = secret;
  config.saltRounds = salt;
  config.tokenExpire = expire;
  return config;
};
module.exports = config;
