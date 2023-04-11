const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('../service/mongoService');

const env = require('../config');
const Status = require('../service/mongoService/status');
const logger = require('../utils/logger');

const initStatusCollection = async () => {
  const status = await Status.findById(1);
  const updateNeeded = !status || env.DB.CURRENT_BLOCK_OVERRIDE;
  if (updateNeeded !== 'false') {
    const CURRENT_BLOCK = parseInt(env.DB.CURRENT_BLOCK);
    const data = {
      blockInserted: CURRENT_BLOCK,
      blockConsumedWalletFilter: CURRENT_BLOCK,
      blockConsumedUpdate: CURRENT_BLOCK,
    };

    await Status.findOneAndUpdate({ _id: 1 }, { $set: data }, { upsert: true });
    logger.info('Set status on DB.');
  } else {
    logger.info('Status already available on DB.');
  }
};

const main = async () => {
  logger.info('Adding initial status to DB.');
  await initStatusCollection();

  process.exit();
};

main();
