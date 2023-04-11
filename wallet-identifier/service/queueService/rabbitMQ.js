const amqp = require('amqplib');

const env = require('../../config');
const logger = require('../../utils/logger');

const { CONN_URL, TXNS_QUEUE, TRANSFER_QUEUE } = env.QUEUE;

let ch = null;

const createConn = async () => {
  const conn = await amqp.connect(CONN_URL);
  if (conn) {
    logger.info('Connected to RabbitMQ');
  }
  ch = await conn.createChannel();
};

exports.publishToQueue = async (data) => {
  if (!data) return;
  if (!ch) await createConn();
  await ch.assertQueue(TRANSFER_QUEUE);
  if (data) {
    await ch.sendToQueue(TRANSFER_QUEUE, Buffer.from(JSON.stringify(data)), { persistent: true });
    logger.info('Published to queue.');
  }
};

exports.consumeQueue = async (method) => {
  if (!ch) await createConn();

  await ch.assertQueue(TXNS_QUEUE);
  await ch.prefetch(1);
  await ch.consume(
    TXNS_QUEUE,
    async (msg) => {
      let out = msg.content.toString();
      out = JSON.parse(out);
      try {
        await method(out);
        ch.ack(msg);
      } catch (err) {
        logger.error(`Error while consuming queue,\n ${err}`);
      }
    },
    { noAck: false }
  );
};

process.on('exit', (code) => {
  ch.close();
  logger.error(`Closing rabbitmq channel`);
});
