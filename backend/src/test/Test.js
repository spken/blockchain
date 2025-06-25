const Blockchain = require("../core/Blockchain.js");
const Transaction = require("../core/Transaction.js");
const Mempool = require("../network/Mempool.js");
const Wallet = require("../core/Wallet.js");

// Erstellen einer Blockchain und eines Mempools
const myBlockchain = new Blockchain();
const myMempool = new Mempool();

// Wallets erstellen
const senderWallet = new Wallet();
const receiverWallet = new Wallet();

// Initiale Transaktion (Reward Transaction direkt hinzufügen)
const initialRewardTx = new Transaction(
  null,
  senderWallet.getPublicKey(),
  myBlockchain.miningReward,
);
myBlockchain.pendingTransactions.push(initialRewardTx);

console.log("Starte initiales Mining, um Coins zu erhalten...");
myBlockchain.minePendingTransactions(senderWallet.getPublicKey());

console.log(
  `Balance nach initialem Mining: ${myBlockchain.getBalanceOfAddress(senderWallet.getPublicKey())} Coins`,
);

// Erstelle und signiere einige Transaktionen mit Gebühren
const tx1 = new Transaction(
  senderWallet.getPublicKey(),
  receiverWallet.getPublicKey(),
  10,
  0.05,
);
senderWallet.signTransaction(tx1);
myMempool.addTransaction(tx1);

const tx2 = new Transaction(
  senderWallet.getPublicKey(),
  receiverWallet.getPublicKey(),
  20,
  0.1,
);
senderWallet.signTransaction(tx2);
myMempool.addTransaction(tx2);

console.log("Mempool Inhalt vor dem Mining:");
console.log(myMempool.getAllTransactions());

// Mining mit selektiven Transaktionen (höchste Gebühren zuerst)
console.log("Starte Mining aus dem Mempool...");
const selectedTransactions = myMempool.getTransactionsSortedByFee(2);
selectedTransactions.forEach((tx) => myBlockchain.createTransaction(tx));
myBlockchain.minePendingTransactions(senderWallet.getPublicKey());
myMempool.removeTransactions(selectedTransactions);

console.log("Blockchain nach Mining:");
console.log(JSON.stringify(myBlockchain.getAllBlocks(), null, 2));

console.log(
  `Balance Absender: ${myBlockchain.getBalanceOfAddress(senderWallet.getPublicKey())} Coins`,
);
console.log(
  `Balance Empfänger: ${myBlockchain.getBalanceOfAddress(receiverWallet.getPublicKey())} Coins`,
);

console.log("Verbleibender Mempool Inhalt nach dem Mining:");
console.log(myMempool.getAllTransactions());

// Blockchain Validität prüfen
console.log(`Blockchain gültig? ${myBlockchain.isChainValid()}`);
