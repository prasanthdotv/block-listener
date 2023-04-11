'use strict';

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const os = require('os');
const { S3StreamLogger } = require('s3-streamlogger');
const AWS = require('aws-sdk');

const config = require('../config/logOptions');
const { NODE_ENV, S3 } = require('../config');

let transportOptions = null;
const file = config.jsonFormat ? config.jsonFile : config.textFile;
const hostname = os.hostname();

const alignFormat = format.printf(({ timestamp, level, message, stack }) => {
  if (stack) {
    return `${timestamp} : [ ${level} ] : ${message}\n${stack}`;
  }
  return `${timestamp} : [ ${level} ] : ${message}`;
});

if (NODE_ENV !== 'dev') {
  const s3Stream = new S3StreamLogger({
    bucket: S3.bucket,
    config: {
      credentials: new AWS.Credentials(S3.config),
      region: S3.region,
    },
    folder: `${S3.folder}/ETH-Update-Balance`,
    max_file_size: '20000000',
    name_format: `%Y-%m-%d-%H-%M-ETH-Update-Balance-Logs-${hostname}.log`,
    rotate_every: '2592000000', // in milliseconds (30 days)
  });
  transportOptions = [
    new transports.Stream({
      stream: s3Stream,
    }),
  ];
} else {
  transportOptions = [
    new DailyRotateFile(file),
    new transports.Console({
      format: format.combine(format.errors({ stack: true }), format.colorize(), alignFormat),
    }),
  ];
}

const logger = createLogger({
  level: config.level,
  format: config.jsonFormat
    ? format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.json()
      )
    : format.combine(
        format.errors({ stack: true }),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        alignFormat
      ),
  transports: transportOptions,
  exitOnError: false,
});

module.exports = logger;
