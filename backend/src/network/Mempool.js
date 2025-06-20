const Transaction = require("../core/Transaction");

class Mempool {
  constructor() {
    this.transactions = [];
  }

  addTransaction(transaction) {
    if (!transaction || typeof transaction.fee !== "number") {
      throw new Error("Transaction must include a valid fee.");
    }

    // Falls nötig, aus JSON eine echte Transaction-Instanz machen:
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

    if (
      this.transactions.some(
        (tx) => tx.calculateHash() === transaction.calculateHash(),
      )
    ) {
      throw new Error("Duplicate transaction detected.");
    }

    this.transactions.push(transaction);
  }

  getTransactionsSortedByFee(limit = 10) {
    return this.transactions
      .slice() // Nicht in-place sortieren!
      .sort((a, b) => b.fee - a.fee)
      .slice(0, limit);
  }

  getTransactionsSortedByAge(limit = 10) {
    return this.transactions
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(0, limit);
  }

  removeTransactions(transactionsToRemove) {
    const hashesToRemove = transactionsToRemove.map((tx) => tx.calculateHash());
    this.transactions = this.transactions.filter(
      (tx) => !hashesToRemove.includes(tx.calculateHash()),
    );
  }

  getAllTransactions() {
    return this.transactions;
  }

  clear() {
    this.transactions = [];
  }
}

module.exports = Mempool;
