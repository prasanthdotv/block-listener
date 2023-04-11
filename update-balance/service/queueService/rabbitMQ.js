const amqp = require('amqplib');

const env = require('../../config');
const logger = require('../../utils/logger');

const { CONN_URL, TRANSFER_QUEUE } = env.QUEUE;

let ch = null;

const createConn = async () => {
  const conn = await amqp.connect(CONN_URL);
  if (conn) {
    logger.info('Connected to RabbitMQ');
  }
  ch = await conn.createChannel();
};

exports.consumeQueue = async (method) => {
  if (!ch) await createConn();

  await ch.assertQueue(TRANSFER_QUEUE);
  await ch.prefetch(1);
  await ch.consume(
    TRANSFER_QUEUE,
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
