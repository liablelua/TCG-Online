const fs = require('fs');
const path = require('path');

const USER_FILE = path.join(process.cwd(), 'data', 'users.json');

const ensureDataDir = () => {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  if (!fs.existsSync(USER_FILE)) {
    fs.writeFileSync(USER_FILE, JSON.stringify({}));
  }
};

const UserModel = {
  getUser: (userId) => {
    ensureDataDir();
    const users = JSON.parse(fs.readFileSync(USER_FILE));
    return users[userId] || null;
  },

  updateUser: (userId, userData) => {
    ensureDataDir();
    const users = JSON.parse(fs.readFileSync(USER_FILE));
    users[userId] = userData;
    fs.writeFileSync(USER_FILE, JSON.stringify(users));
    return userData;
  },

  initUser: (userId) => {
    const defaultUser = {
      id: userId,
      pokeCoins: 500,
      inventory: [],
      lastCoinClaim: new Date().toISOString(),
      lastWonderPick: new Date().toISOString()
    };
    return UserModel.updateUser(userId, defaultUser);
  }
};

module.exports = UserModel;