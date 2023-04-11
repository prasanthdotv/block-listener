const axios = require('axios');

const env = require('../config');

const { BACKEND, APP_BACKEND } = env;

const sendHttpRequestToBackend = async (method, endpoint, token, payload) => {
  const config = {
    method,
    url: BACKEND.URI + endpoint,
    headers: {
      'Content-Type': 'application/json',
    },
    data: payload,
  };
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return axios(config);
};

const sendHttpRequestToAppBackend = async (method, endpoint, token, payload) => {
  const config = {
    method,
    url: APP_BACKEND.URI + endpoint,
    headers: {
      'Content-Type': 'application/json',
    },
    data: payload,
  };
  if (token) {
    config.headers.Authorization = token;
  }
  return axios(config);
};

module.exports = {
  sendHttpRequestToBackend,
  sendHttpRequestToAppBackend,
};
