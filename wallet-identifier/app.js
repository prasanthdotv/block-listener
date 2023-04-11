require('./service/mongoService');
const Status = require('./service/mongoService/status');

const env = require('./config');
const { hexToNumberString } = require('web3-utils');
const { publishToQueue, consumeQueue } = require('./service/queueService/rabbitMQ');
const logger = require('./utils/logger');
const users = require('./utils/userService');
const tokenConfig = require('./config/tokens');

const { ADMIN_WALLET } = env.BLOCKCHAIN;

const getCurrentBlock = async () => {
  let status = await Status.findById(1);
  return status.blockConsumedWalletFilter;
};

const isNotEmptyObject = (obj) => {
  if (obj) return Object.entries(obj).length;
  return false;
};

const updateCurrentBlock = async (newBlock) => {
  await Status.findOneAndUpdate({ _id: 1 }, { $set: { [`blockConsumedWalletFilter`]: newBlock } });
  logger.info(`Block ${newBlock} updated on DB.`);
};

const normalizeErc20Address = (address) => {
  let START = 2;
  let END = 26;

  return (address.substring(0, START) + address.substring(END)).toLowerCase();
};

const normalizeErc20Transactions = (transactions) => {
  return transactions.map((transaction) => {
    return {
      contract: transaction.contract.toLowerCase(),
      txHash: transaction.txHash,
      fromAddress: normalizeErc20Address(transaction.fromAddress),
      toAddress: normalizeErc20Address(transaction.toAddress),
      value: hexToNumberString(transaction.value),
    };
  });
};

const filterEthUserWallets = async (blockdata) => {
  const transactions = blockdata.transactions.eth;
  const adminWallet = ADMIN_WALLET.toLowerCase();
  const userWallets = await users.getWallets();
  const transactionsFiltered = {};

  for (let transaction of transactions) {
    const toAddress = transaction.toAddress.toLowerCase();
    const fromAddress = transaction.fromAddress.toLowerCase();
    if (toAddress && toAddress === adminWallet) {
      if (!transactionsFiltered[adminWallet]) {
        transactionsFiltered[adminWallet] = [];
      }
      transactionsFiltered[adminWallet].push({ type: 'mint', ...transaction });
    } else if (
      (userWallets.includes(toAddress) && fromAddress != adminWallet) ||
      (userWallets.includes(fromAddress) && toAddress != adminWallet)
    ) {
      if (!transactionsFiltered[toAddress]) {
        transactionsFiltered[toAddress] = [];
      }
      transactionsFiltered[toAddress].push({ type: 'transaction', ...transaction });
    }
  }
  blockdata.transactions.eth = transactionsFiltered;
  return;
};

const filterErc20UserWallets = async (blockdata) => {
  const transactions = blockdata.transactions.erc20;
  const userWallets = await users.getWallets();
  const transactionsFiltered = {};

  for (let transaction of transactions) {
    const toAddress = transaction.toAddress.toLowerCase();
    const fromAddress = transaction.fromAddress.toLowerCase();
    const contract = transaction.contract;
    const adminWallet = tokenConfig[contract].admin.toLowerCase();

    if (toAddress && toAddress === adminWallet) {
      if (!transactionsFiltered[contract]) {
        transactionsFiltered[contract] = {};
        transactionsFiltered[contract][toAddress] = [];
      }

      transactionsFiltered[contract][toAddress].push({
        type: 'mint',
        fromAddress: transaction.fromAddress,
        txHash: transaction.txHash,
        value: transaction.value,
      });
    } else if (
      (userWallets.includes(toAddress) && fromAddress != adminWallet) ||
      (userWallets.includes(fromAddress) && toAddress != adminWallet)
    ) {
      if (!transactionsFiltered[contract]) {
        transactionsFiltered[contract] = {};
        transactionsFiltered[contract][toAddress] = [];
      }

      transactionsFiltered[contract][toAddress].push({
        type: 'transaction',
        fromAddress: transaction.fromAddress,
        txHash: transaction.txHash,
        value: transaction.value,
      });
    }
  }

  blockdata.transactions.erc20 = transactionsFiltered;
  return;
};

const matchWallets = async (blockdata) => {
  let LAST_UPDATED_BLOCK = await getCurrentBlock();

  if (blockdata.block > LAST_UPDATED_BLOCK) {
    logger.info(`Processing block : ${blockdata.block}`);
    if (blockdata.transactions.eth.length) {
      await filterEthUserWallets(blockdata);
    }
    if (blockdata.transactions.erc20.length) {
      blockdata.transactions.erc20 = normalizeErc20Transactions(blockdata.transactions.erc20);
      await filterErc20UserWallets(blockdata);
    }

    if (
      isNotEmptyObject(blockdata.transactions.eth) ||
      isNotEmptyObject(blockdata.transactions.erc20)
    ) {
      logger.info(`Refined block ${blockdata.block}: ${JSON.stringify(blockdata)}`);
      await publishToQueue(blockdata);
    }

    await updateCurrentBlock(blockdata.block);
  }
  return;
};

const main = async () => {
  consumeQueue(matchWallets);
};

main();
