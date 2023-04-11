'use strict';

const { NODE_ENV } = require('./index');

if (NODE_ENV == 'production') {
  module.exports = {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
      decimals: 6,
      code: 'USDC',
      admin: '0x0e942f65b748416f1016c3ec5ff772b634379406',
    },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': {
      decimals: 6,
      code: 'USDT',
      admin: '0x19dd4bc2f0d0abce6caa31d27d98e64a502aa5c1',
    },
  };
} else {
  module.exports = {
    '0x8407d97532de98bb31da0a359a7c97b3d4f5d877': {
      decimals: 6,
      code: 'USDC',
      admin: '0x897f2601376784663f2ddbc5288e9346df88002f',
    },
    '0xa543837ba478f3bdab717f6c06c67b2280901126': {
      decimals: 6,
      code: 'USDT',
      admin: '0x4e3f4d13b80aab30b257842955426f0965a7140f',
    },
  };
}
