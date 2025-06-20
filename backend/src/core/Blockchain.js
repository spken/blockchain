const Block = require("./Block");
const Transaction = require("./Transaction");

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.difficulty = 4;
    this.miningReward = 100;
    this.currentNodeUrl = "";
    this.networkNodes = [];
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    this.pendingTransactions.push(
      new Transaction(null, miningRewardAddress, this.miningReward),
    );

    const block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash,
    );
    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];
  }

  createTransaction(transaction) {
    // JSON zu echter Instanz machen, falls nötig:
    if (!(transaction instanceof Transaction)) {
      const t = new Transaction(
        transaction.fromAddress,
        transaction.toAddress,
        transaction.amount,
        transaction.fee,
        transaction.payload,
        transaction.id,
      );
      t.timestamp = transaction.timestamp;
      t.signature = transaction.signature;
      transaction = t;
    }

    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error("Transaction must include from and to addresses.");
    }
    if (!transaction.amount || transaction.amount <= 0) {
      throw new Error("Transaction must have a positive amount.");
    }
    if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction.");
    }
    const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
    if (senderBalance < transaction.amount) {
      throw new Error("Sender does not have enough balance.");
    }
    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) {
          balance -= tx.amount;
        }
        if (tx.toAddress === address) {
          balance += tx.amount;
        }
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }

  getBlockByHash(hash) {
    return this.chain.find((block) => block.hash === hash);
  }

  getPendingTransactions() {
    return this.pendingTransactions;
  }

  getAllBlocks() {
    return this.chain;
  }
}

module.exports = Blockchain;
