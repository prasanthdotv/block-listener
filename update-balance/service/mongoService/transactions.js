'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DB_CONSTANTS = require('../../config/dbConstants');

const transactionSchema = new Schema(
  {
    _id: String,
    fromAddress: {
      type: String,
      index: true,
    },
    code: {
      type: String,
      index: true,
    },
    raw: {
      type: Object,
    },
    status: {
      type: Number,
      enum: Object.values(DB_CONSTANTS.API_STATUS),
      default: DB_CONSTANTS.API_STATUS.NOT_PROCESSED,
      index: true,
    },
    tries: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

const Transactions = mongoose.model('ethTransactions', transactionSchema);
module.exports = Transactions;
