require('./service/mongoService');
const BigNumber = require('bignumber.js');

const { web3, web3Reset } = require('./utils/web3');
const Status = require('./service/mongoService/status');
const { consumeQueue } = require('./service/queueService/rabbitMQ');
const logger = require('./utils/logger');
const env = require('./config');
const tokenConfig = require('./config/tokens');
const {
  insertToDB,
  updateTransactionDetails,
  updateTransactionStatus,
  processPendingRequests,
} = require('./service/transactionService');

const RETRIES = parseInt(env.BLOCKCHAIN.RETRIES);

const getCurrentBlock = async () => {
  let status = await Status.findById(1);
  return status.blockConsumedUpdate;
};

const updateCurrentBlock = async (newBlock) => {
  await Status.findOneAndUpdate({ _id: 1 }, { $set: { blockConsumedUpdate: newBlock } });
  logger.info(`Block ${newBlock} updated on DB.`);
};

const isNotEmptyObject = (obj) => {
  if (obj) return Object.entries(obj).length;
  return false;
};

const getBigNumberObject = (amount, decimals = 18) => {
  return BigNumber(amount)
    .dividedBy(BigNumber(10 ** decimals))
    .toString();
};

const EthWalletTransactionsUpdate = async (address, addressTransactions) => {
  return Promise.all(
    addressTransactions.map(async (transaction) => {
      if (transaction.value > 0) {
        const payload = {
          type: transaction.type,
          toAddress: address,
          fromAddress: transaction.fromAddress,
          value: getBigNumberObject(transaction.value, 18),
          txHash: transaction.txHash,
          code: 'ETH',
        };
        await insertToDB(payload);
        if (payload.type === 'transaction') {
          return updateTransactionStatus(payload);
        } else {
          return updateTransactionDetails(payload);
        }
      }
      return true;
    })
  );
};

const ERC20WalletTransactionsUpdate = async (contractAddress, address, addressTransactions) => {
  return Promise.all(
    addressTransactions.map(async (transaction) => {
      if (transaction.value > 0) {
        const payload = {
          type: transaction.type,
          toAddress: address,
          fromAddress: transaction.fromAddress,
          value: getBigNumberObject(transaction.value, tokenConfig[contractAddress].decimals),
          txHash: transaction.txHash,
          code: tokenConfig[contractAddress].code,
        };
        await insertToDB(payload);
        if (payload.type === 'transaction') {
          return updateTransactionStatus(payload);
        } else {
          return updateTransactionDetails(payload);
        }
      }
      return true;
    })
  );
};

const ERC20ContractTransactionsUpdate = async (contractAddress, contractAddressTransactions) => {
  return Promise.all(
    Object.keys(contractAddressTransactions).map(async (address) => {
      address = address.toLowerCase();
      return ERC20WalletTransactionsUpdate(
        contractAddress,
        address,
        contractAddressTransactions[address]
      );
    })
  );
};

const pushEthTransactionDetails = async (transactions) => {
  return Promise.all(
    Object.keys(transactions).map((address) => {
      address = address.toLowerCase();
      return EthWalletTransactionsUpdate(address, transactions[address]);
    })
  );
};

const pushERC20TransactionDetails = async (transactions) => {
  return Promise.all(
    Object.keys(transactions).map((address) => {
      address = address.toLowerCase();
      return ERC20ContractTransactionsUpdate(address, transactions[address]);
    })
  );
};

const pushTransferDetails = async (blockData) => {
  const LAST_UPDATED_BLOCK = await getCurrentBlock();

  if (blockData.block > LAST_UPDATED_BLOCK) {
    if (
      isNotEmptyObject(blockData.transactions.eth) ||
      isNotEmptyObject(blockData.transactions.erc20)
    ) {
      let retryIter = 0;
      while (true) {
        try {
          if (Object.keys(blockData.transactions.eth).length) {
            await pushEthTransactionDetails(blockData.transactions.eth);
          }
          if (Object.keys(blockData.transactions.erc20).length) {
            await pushERC20TransactionDetails(blockData.transactions.erc20);
          }
          await updateCurrentBlock(blockData.block);
          break;
        } catch (err) {
          if (retryIter < RETRIES) {
            retryIter++;
            logger.error(`Error: ${err},"\n Retry attempt ${retryIter}`);
          } else {
            logger.error('All attempts failed, exiting...');
            process.exit();
          }
        }
      }
    }
  }
  return;
};

const blockReader = async (block) => {
  // process pending transactions in a 1000 block intervals
  if (parseInt(block.number) % 5 == 0) {
    logger.info('Processing pending transactions');
    processPendingRequests();
  }
};

const subscribeBlock = () => {
  logger.info('Subscribing to Ethereum blocks');
  web3.eth
    .subscribe('newBlockHeaders')
    .on('data', blockReader)
    .on('error', (err) => {
      logger.error(`Reconnecting..., ${err}`);
      web3Reset();
      setTimeout(subscribeBlock, 5000);
    });
};

const main = async () => {
  consumeQueue(pushTransferDetails);
  subscribeBlock();
};

main();
