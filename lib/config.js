let config = {
  jwtSecret: '',
  tokenExpire: '',
  saltRounds: ''
};

 config.conf = function(secret, salt, expire) {
  config.jwtSecret = secret;
  config.saltRounds = Number(salt);
  config.tokenExpire = expire;
  return config;
};
module.exports = config;
