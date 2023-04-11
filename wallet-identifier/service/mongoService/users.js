'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      lowercase: true,
    },
    ethereumAddress: {
      type: String,
      required: true,
      unique: true,
      match: /^0x[a-fA-F0-9]{40}$/,
      lowercase: true,
    },
    bitcoinAddress: {
      type: String,
      required: true,
      unique: true,
      match: /^[13mn][a-zA-Z\d]{24,34}$/,
      lowercase: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

const User = mongoose.model('users', userSchema);
module.exports = User;
