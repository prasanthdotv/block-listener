const amqp = require('amqplib');

const env = require('../../config');
const logger = require('../../utils/logger');

const { CONN_URL, TXNS_QUEUE } = env.QUEUE;

let ch = null;

const createConn = async () => {
  conn = await amqp.connect(CONN_URL);
  if (conn) {
    logger.info('Connected to RabbitMQ');
  }
  ch = await conn.createChannel();
};

createConn();

exports.publishToQueue = async (data) => {
  if (!data) return;
  if (!ch) await createConn();
  await ch.assertQueue(TXNS_QUEUE);
  if (data) {
    await ch.sendToQueue(TXNS_QUEUE, Buffer.from(JSON.stringify(data)), { persistent: true });
    logger.info('Published to queue.');
  }
};

exports.publishBatchToQueue = async (data) => {
  if (!ch) await createConn();
  await ch.assertQueue(TXNS_QUEUE);
  for (item of data) {
    if (item) {
      await ch.sendToQueue(TXNS_QUEUE, Buffer.from(JSON.stringify(item)), { persistent: true });
    }
  }
  logger.info('Batch publish successful.');
};

process.on('exit', (code) => {
  ch.close();
  logger.error(`Closing rabbitmq channel.`);
});
