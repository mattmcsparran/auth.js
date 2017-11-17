let config = {}
  config.bcryptSecret = (secret) => {
    return secret;
  };
  config.jwtSecret = (secret) => {
    return secret;
  }
  config.saltRounds = (salt) => {
    return salt || 16;
  }
  config.tokenExpire = (expire) => {
    return expire || { expiresIn: '1h' };
  }
module.exports = config;
