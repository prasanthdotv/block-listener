require('./service/mongoService');
const CronJob = require('cron').CronJob;

const Status = require('./service/mongoService/status');
const { publishToQueue, publishBatchToQueue } = require('./service/queueService/rabbitMQ');
const { web3, web3Reset } = require('./utils/web3');
const logger = require('./utils/logger');
const { sendNotificationMail } = require('./utils/mail');
const env = require('./config');
const tokenConfig = require('./config/tokens');

let MUTEX = false;
let isAlive = true;
let internalRestartCount = 0;
const { BLOCK_CONFIRMATIONS, BATCH_SIZE, RETRIES, ERC20_TRANSFER_TOPIC } = env.BLOCKCHAIN;

const getCurrentBlock = async () => {
  let status = await Status.findById(1);
  return status.blockInserted;
};

const updateCurrentBlock = async (newBlock) => {
  await Status.findOneAndUpdate({ _id: 1 }, { $set: { blockInserted: newBlock } });
  logger.info(`Block ${newBlock} updated on DB.`);
};

const sortBlockList = (blockList) => {
  return blockList.sort((firstEl, SecondEl) => firstEl.block - SecondEl.block);
};

const extractInfo = (blockLogs) => {
  if (Array.isArray(blockLogs))
    return blockLogs.reduce((acc, log) => {
      acc.push({
        contract: log.address,
        txHash: log.transactionHash,
        fromAddress: log.topics[1],
        toAddress: log.topics[2],
        value: log.data,
      });
      return acc;
    }, []);

  return {
    contract: blockLogs.address,
    txHash: blockLogs.transactionHash,
    fromAddress: blockLogs.topics[1],
    toAddress: blockLogs.topics[2],
    value: blockLogs.data,
  };
};

const getLogs = async (block = {}) => {
  if (!block.fromBlock) block.fromBlock = block.toBlock;

  const filter = {
    fromBlock: block.fromBlock,
    toBlock: block.toBlock,
    address: Object.keys(tokenConfig),
    topics: [ERC20_TRANSFER_TOPIC],
  };
  return await web3.eth.getPastLogs(filter);
};

const getLogsForBlock = async (blockNumber) => {
  blockLogs = await getLogs({ toBlock: blockNumber });
  extracted = extractInfo([...blockLogs]);
  return extracted;
};

const listReceived = async (block) => {
  if (!block) return;
  const TOKENS = Object.keys(tokenConfig).map((tokenAddress) => tokenAddress.toLowerCase());
  const received = {
    transactions: { eth: [], erc20: [] },
    block: block.number,
  };
  const transactions = block.transactions;
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    if (transaction.value !== '0x0' && transaction.to) {
      received.transactions.eth.push({
        txHash: transaction.hash,
        fromAddress: transaction.from.toLowerCase(),
        toAddress: transaction.to.toLowerCase(),
        value: transaction.value,
      });
    }
  }
  const txnLogs = await getLogsForBlock(block.number);
  if (txnLogs) {
    for (let j = 0; j < txnLogs.length; j++) {
      const transaction = txnLogs[j];
      if (transaction.contract && TOKENS.includes(transaction.contract.toLowerCase())) {
        received.transactions.erc20.push(transaction);
      }
    }

    return received;
  }
};

const getBlock = async (blockNumber) => {
  const block = await web3.eth.getBlock(blockNumber, true);
  const received = await listReceived(block);
  return received;
};

const blockReader = async (block) => {
  let retryIter = 0;
  if (!MUTEX) {
    let CURRENT_BLOCK = await getCurrentBlock();
    if (block.number - BLOCK_CONFIRMATIONS - CURRENT_BLOCK > 1) {
      await catchUp(CURRENT_BLOCK + 1, block.number - BLOCK_CONFIRMATIONS);
    } else {
      while (true) {
        try {
          logger.info(`Processing block: ${block.number - BLOCK_CONFIRMATIONS}`);
          const result = await getBlock(block.number - BLOCK_CONFIRMATIONS);
          if (
            (result && result.transactions && result.transactions.eth.length) ||
            result.transactions.erc20.length
          ) {
            logger.info(`Transactions detected on block ${result.block}`);
            await publishToQueue(result);
          }
          await updateCurrentBlock(block.number - BLOCK_CONFIRMATIONS);
          isAlive = true;
          retryIter = 0;
          internalRestartCount = 0;
          break;
        } catch (err) {
          if (retryIter < RETRIES) {
            retryIter++;
            logger.error(err);
            logger.warn(`Retry attempt ${retryIter}`);
          } else {
            if (internalRestartCount < RETRIES) {
              internalRestartCount++;
              logger.error('All retry attempts failed, Restarting...');
              web3Reset();
              setTimeout(subscribeBlock, 30000);
              break;
            } else {
              logger.error('All restart attempts failed, Exiting...');
              await sendNotificationMail(err);
              process.exit(1);
            }
          }
        }
      }
    }
  }
};

const batchExecuter = async (startBlock, endBlock) => {
  let execList = [];
  for (let block = startBlock; block <= endBlock; block++) {
    logger.info(`Processing block: ${block}`);
    execList.push(getBlock(block));
  }
  try {
    const result = await Promise.all(execList);
    sortBlockList(result);
    const filteredResult = result.filter(
      (block) => block.transactions.eth.length > 0 || block.transactions.erc20.length > 0
    );
    if (filteredResult.length) {
      logger.info(`Transactions detected between blocks ${startBlock} - ${endBlock}`);
      await publishBatchToQueue(result);
    }
    await updateCurrentBlock(endBlock);
  } catch (error) {
    logger.error(error);
    throw Error('Error getting block details.');
  }
};

const catchUp = async (startBlock, endBlock) => {
  MUTEX = true;
  logger.info(`Catching up ${endBlock - startBlock} blocks`);
  let blockInit = startBlock;
  let retryIter = 0;

  while (blockInit <= endBlock) {
    try {
      if (blockInit + (BATCH_SIZE - 1) <= endBlock) {
        logger.info(`From ${blockInit} To ${blockInit + (BATCH_SIZE - 1)}`);
        await batchExecuter(blockInit, blockInit + (BATCH_SIZE - 1));
        blockInit += BATCH_SIZE;
        isAlive = true;
        retryIter = 0;
        internalRestartCount = 0;
      } else {
        logger.info(`From ${blockInit} To ${endBlock}`);
        await batchExecuter(blockInit, endBlock);
        isAlive = true;
        retryIter = 0;
        internalRestartCount = 0;
        break;
      }
    } catch (err) {
      MUTEX = false;
      if (retryIter < RETRIES) {
        retryIter++;
        logger.error(err);
        logger.warn(`Retry attempt ${retryIter}`);
      } else {
        if (internalRestartCount < RETRIES) {
          internalRestartCount++;
          logger.error('All retry attempts failed, Restarting...');
          web3Reset();
          setTimeout(subscribeBlock, 30000);
          break;
        } else {
          logger.error('All restart attempts failed, Exiting...');
          await sendNotificationMail(err);
          process.exit(1);
        }
      }
    }
  }

  MUTEX = false;
};

const subscribeBlock = () => {
  logger.info('Subscribing to Ethereum blocks');
  web3.eth
    .subscribe('newBlockHeaders')
    .on('data', blockReader)
    .on('error', async (err) => {
      await sendNotificationMail(err);
      logger.error(`Reconnecting..., ${err}`);
      web3Reset();
      setTimeout(subscribeBlock, 30000);
    });
};

const main = async () => {
  new CronJob({
    cronTime: '0 */10 * * * *',
    onTick: async () => {
      if (!isAlive) {
        logger.error('APP_IDLE: Unable to receive new blocks.');
        await sendNotificationMail('APP_IDLE: Unable to receive new blocks.');
        process.exit(1);
      }
      isAlive = false;
    },
    start: true,
    runOnInit: true,
  });
  subscribeBlock();
};

main();
