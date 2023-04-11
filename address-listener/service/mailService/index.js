const nodemailer = require('nodemailer');

const { SMTP } = require('../../config');

// Create a transporter object using SMTP transport
exports.transporter = nodemailer.createTransport({
  host: SMTP.HOST, // replace with your email provider's SMTP server
  port: SMTP.PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP.USERNAME, // replace with your email address
    pass: SMTP.PASSWORD, // replace with your email password
  },
});
