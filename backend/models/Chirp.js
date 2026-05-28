const db = require('../db');

class Chirp {
  static async notImplemented() {
    throw new Error('Not implemented');
  }
}

module.exports = Chirp;
