const { transporter } = require('../service/mailService');
const { NODE_ENV, SMTP } = require('../config/index');
const logger = require('./logger');

const sendNotificationMail = async (error) => {
  try {
    const currentTime = getCurrentTime();
    const message = {
      from: SMTP.SENDER, // replace with your email address
      to: SMTP.RECEIVERS.join(', '), // replace with recipient's email address
      subject: `Ethereum Wallet Listener Provider Issue on ${NODE_ENV.toUpperCase()} instance - ${currentTime}`,
      text: `Hi, \n\nUnable to get response from Ethereum Provider. Application might have stopped syncing. Please resolve it as soon as possible.\n\n ${error}`,
    };
    await transporter.sendMail(message);
    logger.info('Notification mail sent!');
  } catch (error) {
    logger.error(`Error in sending Notification mail : ${JSON.stringify(error)}`);
  }
  return;
};

const getCurrentTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() returns zero-based month, so we add 1
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const timezoneOffset = now.getTimezoneOffset();

  const timezoneOffsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const timezoneOffsetMinutes = Math.abs(timezoneOffset) % 60;
  const timezoneOffsetSign = timezoneOffset < 0 ? '-' : '+';
  const formattedTimezoneOffset = `${timezoneOffsetSign}${timezoneOffsetHours
    .toString()
    .padStart(2, '0')}:${timezoneOffsetMinutes.toString().padStart(2, '0')}`;

  const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${formattedTimezoneOffset}`;

  return `${formattedDate} ${formattedTime}`;
};

module.exports = { sendNotificationMail };
