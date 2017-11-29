let config = {
  jwtSecret: String,
  tokenExpire: Object,
  saltRounds: Number
};

 config.conf = function(secret, salt, expire) {
  config.jwtSecret = secret;
  config.saltRounds = Number(salt);
  config.tokenExpire = expire;
  return config;
};
module.exports = config;
