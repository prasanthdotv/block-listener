'use strict';

const env = {
  NODE_ENV: process.env.NODE_ENV || 'dev',
  BLOCKCHAIN: {
    NETWORK: process.env.NETWORK || 'rinkeby',
    WSS_PROVIDER_URL: process.env.WSS_PROVIDER_URL,
    HTTP_PROVIDER_URL: process.env.HTTP_PROVIDER_URL,
    ADMIN_WALLET: process.env.ADMIN_WALLET,
    BLOCK_CONFIRMATIONS: process.env.BLOCK_CONFIRMATIONS || 1,
    BATCH_SIZE: process.env.BATCH_SIZE || 20,
    RETRIES: process.env.RETRIES || 3,
    ERC20_TRANSFER_TOPIC: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', //Hash of Transfer event
  },
  QUEUE: {
    CONN_URL: process.env.RMQ_CONN_URL || 'amqp://localhost:5672',
    TXNS_QUEUE: process.env.RMQ_TXNS_QUEUE || 'txns_queue',
    TRANSFER_QUEUE: process.env.RMQ_TRANSFER_QUEUE || 'transfer_queue',
  },
  DB: {
    URI: process.env.DB_URI || 'mongodb://mongo:27017/wallet_listener',
    CURRENT_BLOCK: process.env.CURRENT_BLOCK,
    CURRENT_BLOCK_OVERRIDE: process.env.CURRENT_BLOCK_OVERRIDE,
  },
  BACKEND: {
    URI: process.env.BACKEND_API_URI || 'http://localhost:3000/api',
    API_END_POINT: process.env.BACKEND_API_ENDPOINT,
    AUTH_END_POINT: process.env.BACKEND_AUTH_ENDPOINT,
    USERNAME: process.env.BACKEND_USERNAME,
    PASSWORD: process.env.BACKEND_PASSWORD,
  },
  S3: {
    bucket: process.env.S3_BUCKET,
    config: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    region: process.env.S3_REGION,
    folder: process.env.S3_FOLDER,
  },
};
module.exports = env;
