const User = require('../service/mongoService/users');

const getWallets = async () => {
  const users = await User.find({});
  const addresses = users.map((user) => user.ethereumAddress);
  return addresses;
};

module.exports = {
  getWallets,
};
