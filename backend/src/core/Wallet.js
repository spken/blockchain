const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

class Wallet {
  constructor() {
    this.keyPair = ec.genKeyPair();
    this.publicKey = this.keyPair.getPublic("hex");
    this.privateKey = this.keyPair.getPrivate("hex");
  }

  // KORREKT!
  static fromPrivateKey(privateKey) {
    const wallet = new Wallet();
    wallet.keyPair = ec.keyFromPrivate(privateKey);
    wallet.publicKey = wallet.keyPair.getPublic("hex"); // WICHTIG!
    wallet.privateKey = privateKey;
    return wallet;
  }

  getPublicKey() {
    return this.publicKey;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  signTransaction(transaction) {
    console.log(
      "DEBUG wallet: transaction.fromAddress:",
      transaction.fromAddress,
    );
    console.log("DEBUG wallet: this.publicKey:", this.publicKey);
    console.log(
      "DEBUG wallet: Gleich?",
      transaction.fromAddress === this.publicKey,
    );
    if (transaction.fromAddress !== this.publicKey) {
      throw new Error("You cannot sign transactions for other wallets!");
    }
    transaction.signTransaction(this.keyPair);
  }
}

module.exports = Wallet;
