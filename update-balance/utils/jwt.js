const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const env = require('../config');
const logger = require('./logger');
const { sendHttpRequestToBackend } = require('./httpRequest');

let TOKEN = null;

const getAuthPublicKey = () => {
  const pubKeyPath = path.resolve(__dirname, '../config/public-key.pem');
  const publicKey = fs.readFileSync(pubKeyPath, {
    encoding: 'utf8',
  });
  return publicKey;
};

const verifyToken = (token) => {
  if (!token) return false;
  try {
    jwt.verify(token, getAuthPublicKey());
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    return false;
  }
};

const getJwtToken = async () => {
  try {
    const verified = verifyToken(TOKEN);
    if (!verified) {
      const payload = {
        username: env.BACKEND.USERNAME,
        password: env.BACKEND.PASSWORD,
      };
      const response = await sendHttpRequestToBackend(
        'post',
        env.BACKEND.AUTH_END_POINT,
        null,
        payload
      );
      TOKEN = response.data.data.accessToken;
    }
    return TOKEN;
  } catch (e) {
    logger.error(`Unable to get auth token : ${JSON.stringify(e)}`);
  }
};

module.exports = {
  getAuthPublicKey,
  verifyToken,
  getJwtToken,
};
