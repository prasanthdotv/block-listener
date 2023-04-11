'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const statusSchema = new Schema(
  {
    _id: Number,
    blockInserted: Number,
    blockConsumedWalletFilter: Number,
    blockConsumedUpdate: Number,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

const Status = mongoose.model('ethBlockStatus', statusSchema);
module.exports = Status;
