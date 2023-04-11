const logger = require('../../utils/logger');
const Transactions = require('../mongoService/transactions');
const env = require('../../config');
const DB_CONSTANTS = require('../../config/dbConstants');
const {
  sendHttpRequestToBackend,
  sendHttpRequestToAppBackend,
} = require('../../utils/httpRequest');
const { getJwtToken } = require('../../utils/jwt');

const RETRIES = parseInt(env.BLOCKCHAIN.RETRIES);

const fetchPendingRequests = async () => {
  return await Transactions.find({
    status: DB_CONSTANTS.API_STATUS.NOT_PROCESSED,
    tries: { $lt: RETRIES },
  });
};

const processPendingRequests = async () => {
  const pendingRequests = await fetchPendingRequests();

  if (pendingRequests.length > 0) {
    // process one by one
    const promises = pendingRequests.map(async (txn) => {
      if (txn.raw.type === 'transaction') {
        return updateTransactionStatus(txn.raw);
      } else {
        return updateTransactionDetails(txn.raw);
      }
    });
    await Promise.allSettled(promises);
  } else {
    logger.info('No transactions on pending list.');
  }
};

const insertToDB = async (payload) => {
  const { fromAddress, txHash, code } = payload;
  const result = await Transactions.find({ _id: txHash });
  if (!result.length) {
    await Transactions.create({
      _id: txHash,
      fromAddress,
      code,
      raw: payload,
    });
  }
  return;
};

const updateTransactionDetails = async (transaction) => {
  let payload;
  const txn = await Transactions.findOne({ _id: transaction.txHash });
  const keys = Object.keys(txn);
  if ((keys.length && txn.status === DB_CONSTANTS.API_STATUS.NOT_PROCESSED) || !keys.length) {
    try {
      payload = {
        chain: `Ethereum (${env.BLOCKCHAIN.NETWORK})`,
        ...transaction,
      };
      await Transactions.findOneAndUpdate(
        { _id: payload.txHash },
        { status: DB_CONSTANTS.API_STATUS.PROCESSING }
      );

      logger.info(`Sending payload : ${JSON.stringify(payload)}`);
      const token = await getJwtToken();
      await sendHttpRequestToBackend('post', env.BACKEND.API_END_POINT, token, payload);

      await Transactions.findOneAndUpdate(
        { _id: payload.txHash },
        { status: DB_CONSTANTS.API_STATUS.PROCESSED }
      );

      logger.info('API Call successful!');
    } catch (e) {
      logger.error(`API Call failed : ${JSON.stringify(e)}`);
      await Transactions.findOneAndUpdate(
        { _id: payload.txHash },
        { status: DB_CONSTANTS.API_STATUS.NOT_PROCESSED },
        { $inc: { tries: 1 } }
      );
    }
  }

  return true;
};

const updateTransactionStatus = async (transaction) => {
  let payload;
  const { toAddress, fromAddress, value, txHash, code } = transaction;
  const txn = await Transactions.findOne({ _id: transaction.txHash });
  const keys = Object.keys(txn);
  if ((keys.length && txn.status === DB_CONSTANTS.API_STATUS.NOT_PROCESSED) || !keys.length) {
    try {
      payload = {
        user_address: toAddress,
        from_address: fromAddress,
        amount: value,
        coin_code: code,
        transfer_id: txHash,
      };
      await Transactions.findOneAndUpdate(
        { _id: txHash },
        { status: DB_CONSTANTS.API_STATUS.PROCESSING }
      );

      logger.info(`Sending payload : ${JSON.stringify(payload)}`);

      const token = Buffer.from(env.APP_BACKEND.API_KEY).toString('base64');
      await sendHttpRequestToAppBackend('post', env.APP_BACKEND.API_END_POINT, token, payload);

      await Transactions.findOneAndUpdate(
        { _id: txHash },
        { status: DB_CONSTANTS.API_STATUS.PROCESSED }
      );

      logger.info('API Call successful!');
    } catch (e) {
      logger.error(`API Call failed : ${JSON.stringify(e)}`);
      await Transactions.findOneAndUpdate(
        { _id: txHash },
        { status: DB_CONSTANTS.API_STATUS.NOT_PROCESSED },
        { $inc: { tries: 1 } }
      );
    }
  }

  return true;
};

module.exports = {
  insertToDB,
  updateTransactionDetails,
  updateTransactionStatus,
  processPendingRequests,
};
