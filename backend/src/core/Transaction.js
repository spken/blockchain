const crypto = require("crypto");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const { v4: uuidv4 } = require("uuid");

class Transaction {
  constructor(
    fromAddress,
    toAddress,
    amount,
    fee = 0,
    payload = null,
    id = null,
  ) {
    this.id = id || uuidv4(); // << NEU
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.fee = fee;
    this.timestamp = new Date().toISOString();
    this.payload = payload; // << NEU
    this.signature = null;
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.fromAddress +
          this.toAddress +
          this.amount +
          this.fee +
          this.timestamp +
          JSON.stringify(this.payload),
      )
      .digest("hex");
  }

  signTransaction(signingKey) {
    if (!signingKey) {
      throw new Error("Signing key is required.");
    }
    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("Cannot sign transaction for other wallets.");
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");
    this.signature = sig.toDER("hex");
  }

  isValid() {
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction.");
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

module.exports = Transaction;
