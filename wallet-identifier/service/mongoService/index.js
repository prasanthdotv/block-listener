'use strict';

const mongoose = require('mongoose');

const logger = require('../../utils/logger');
const env = require('../../config');

const fs = require('fs');

if (env.NODE_ENV === 'production') {
  const sslCA = fs.readFileSync('./rds-combined-ca-bundle.pem', { encoding: 'utf-8' });
  mongoose.connect(env.DB.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    ssl: true,
    sslCA,
    replicaSet: 'rs0',
    readPreference: 'secondaryPreferred',
    retryWrites: false,
  });
} else {
  mongoose.connect(env.DB.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });
}

const db = mongoose.connection;

db.once('open', () => logger.info('MongoDB connected'));

db.on('error', (err) => logger.error(`MongoDB connection error - ${err.toString()}`));
