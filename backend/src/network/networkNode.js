const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Blockchain = require("../core/Blockchain");
const Transaction = require("../core/Transaction");
const Mempool = require("./Mempool");
const Wallet = require("../core/Wallet");
const { v4: uuidv4 } = require("uuid");
const rp = require("request-promise");

const app = express();
const port = process.argv[2];
const currentNodeUrl = process.argv[3];

const allWallets = [];

app.use(cors());
app.use(bodyParser.json());

const blockchain = new Blockchain();
const mempool = new Mempool();
const nodeAddress = uuidv4().split("-").join("");

blockchain.currentNodeUrl = currentNodeUrl;
blockchain.networkNodes = [];

// Node registrieren und an Netzwerk broadcasten
app.post("/register-and-broadcast-node", (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if (!blockchain.networkNodes.includes(newNodeUrl))
    blockchain.networkNodes.push(newNodeUrl);

  const regNodesPromises = blockchain.networkNodes.map((networkNodeUrl) => {
    return rp({
      uri: networkNodeUrl + "/register-node",
      method: "POST",
      body: { newNodeUrl },
      json: true,
    });
  });

  Promise.all(regNodesPromises)
    .then(() => {
      return rp({
        uri: newNodeUrl + "/register-nodes-bulk",
        method: "POST",
        body: {
          allNetworkNodes: [
            ...blockchain.networkNodes,
            blockchain.currentNodeUrl,
          ],
        },
        json: true,
      });
    })
    .then(() => res.json({ note: "Node erfolgreich im Netzwerk registriert." }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Einzelnen Node registrieren
app.post("/register-node", (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if (
    !blockchain.networkNodes.includes(newNodeUrl) &&
    blockchain.currentNodeUrl !== newNodeUrl
  ) {
    blockchain.networkNodes.push(newNodeUrl);
  }
  res.json({ note: "Node erfolgreich registriert." });
});

// Mehrere Nodes gleichzeitig registrieren
app.post("/register-nodes-bulk", (req, res) => {
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach((networkNodeUrl) => {
    if (
      !blockchain.networkNodes.includes(networkNodeUrl) &&
      blockchain.currentNodeUrl !== networkNodeUrl
    ) {
      blockchain.networkNodes.push(networkNodeUrl);
    }
  });
  res.json({ note: "Mehrfachregistrierung erfolgreich." });
});

// Gesamte Blockchain abrufen
app.get("/blockchain", (req, res) => {
  res.json(blockchain);
});

// Alle Blöcke abrufen
app.get("/blocks", (req, res) => {
  res.json(blockchain.getAllBlocks());
});

// Einzelnen Block abrufen
app.get("/blocks/:hash", (req, res) => {
  const block = blockchain.getBlockByHash(req.params.hash);
  if (block) {
    res.json(block);
  } else {
    res.status(404).json({ error: "Block nicht gefunden" });
  }
});

// Alle Transaktionen im Mempool
app.get("/mempool", (req, res) => {
  res.json(mempool.getAllTransactions());
});

// Mempool nach Gebühren sortiert
app.get("/mempool/fees", (req, res) => {
  res.json(mempool.getTransactionsSortedByFee());
});

// Mempool nach Alter sortiert
app.get("/mempool/age", (req, res) => {
  res.json(mempool.getTransactionsSortedByAge());
});

app.post("/transaction", (req, res) => {
  try {
    // Transaktion aus JSON zu echter Instanz machen:
    const data = req.body;
    const transaction = new Transaction(
      data.fromAddress,
      data.toAddress,
      data.amount,
      data.fee,
      data.payload,
      data.id,
    );
    transaction.timestamp = data.timestamp;
    transaction.signature = data.signature;

    // Optional: Gültigkeit prüfen
    if (!transaction.isValid()) {
      throw new Error("Ungültige Transaktion!");
    }

    mempool.addTransaction(transaction);
    res.json({ message: "Transaction erfolgreich empfangen.", transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Transaktion an alle Nodes broadcasten

app.post("/transaction/broadcast", async (req, res) => {
  const { fromAddress, toAddress, amount, fee, privateKey, payload, id } =
    req.body;
  const transaction = new Transaction(
    fromAddress,
    toAddress,
    amount,
    fee,
    payload,
    id,
  );

  // Wallet korrekt aus dem PrivateKey erzeugen!
  const wallet = Wallet.fromPrivateKey(privateKey);

  // Debug-Ausgabe für Fehlersuche
  console.log("fromAddress:", fromAddress);
  console.log("wallet.publicKey:", wallet.publicKey);
  console.log("Gleich?", fromAddress === wallet.publicKey);

  try {
    wallet.signTransaction(transaction); // <- wirft Fehler, wenn Keys nicht passen
    mempool.addTransaction(transaction);

    // Broadcasting an alle anderen Nodes
    const requestPromises = blockchain.networkNodes.map((networkNodeUrl) => {
      return rp({
        uri: networkNodeUrl + "/transaction",
        method: "POST",
        body: transaction,
        json: true,
      });
    });

    await Promise.all(requestPromises);

    res.json({ message: "Transaktion erfolgreich broadcasted.", transaction });
  } catch (error) {
    console.error(error.stack);
    res.status(400).json({ error: error.message });
  }
});

// Pending Transaktionen abrufen
app.get("/transactions/pending", (req, res) => {
  res.json(blockchain.getPendingTransactions());
});

// Mining und Block-Broadcasting
app.post("/mine", async (req, res) => {
  const { miningRewardAddress, limit } = req.body;
  blockchain.pendingTransactions.push(
    new Transaction(null, miningRewardAddress, blockchain.miningReward),
  );

  const transactionsToMine = mempool.getTransactionsSortedByFee(limit || 10);
  transactionsToMine.forEach((tx) => blockchain.createTransaction(tx));
  blockchain.minePendingTransactions(miningRewardAddress);
  mempool.removeTransactions(transactionsToMine);

  const newBlock = blockchain.getLatestBlock();

  // Broadcasting an andere Nodes
  const requestPromises = blockchain.networkNodes.map((networkNodeUrl) => {
    return rp({
      uri: networkNodeUrl + "/receive-new-block",
      method: "POST",
      body: { newBlock },
      json: true,
    });
  });

  try {
    await Promise.all(requestPromises);
    res.json({
      note: "Block erfolgreich gemint und an andere Nodes gesendet.",
      block: newBlock,
    });
  } catch (err) {
    res.status(500).json({
      note: "Fehler beim Broadcasting des Blocks",
      error: err.message,
    });
  }
});

// Broadcast eines neuen Blocks an alle Nodes
app.post("/receive-new-block", (req, res) => {
  const newBlock = req.body.newBlock;
  const lastBlock = blockchain.getLatestBlock();

  const correctHash = lastBlock.hash === newBlock.previousHash;
  const correctIndex = lastBlock.index + 1 === newBlock.index;

  if (correctHash && correctIndex) {
    blockchain.chain.push(newBlock);
    blockchain.pendingTransactions = [];
    res.json({
      note: "Neuer Block akzeptiert und hinzugefügt",
      block: newBlock,
    });
  } else {
    res.status(400).json({ note: "Block abgelehnt.", block: newBlock });
  }
});

app.get("/wallets", (req, res) => {
  res.json(allWallets);
});

// Faucet-Endpunkt für initiales Test-Guthaben
app.post("/faucet", (req, res) => {
  const { address, amount } = req.body;
  if (!address) {
    return res.status(400).json({ error: "Wallet-Adresse erforderlich." });
  }
  const faucetAmount = amount || 100;
  const faucetTx = new Transaction(null, address, faucetAmount);
  blockchain.pendingTransactions.push(faucetTx);
  blockchain.minePendingTransactions(address);

  res.json({
    message: `Faucet erfolgreich: ${faucetAmount} Coins erhalten!`,
    transaction: faucetTx,
  });
});

// Kontostand abfragen
app.get("/wallet/balance/:address", (req, res) => {
  const balance = blockchain.getBalanceOfAddress(req.params.address);
  res.json({ address: req.params.address, balance });
});

// Wallet erzeugen
app.post("/wallet", (req, res) => {
  const wallet = new Wallet();
  allWallets.push({
    publicKey: wallet.getPublicKey(),
    privateKey: wallet.getPrivateKey(),
    created: new Date().toISOString(),
  });
  res.json({
    publicKey: wallet.getPublicKey(),
    privateKey: wallet.getPrivateKey(),
  });
});

// Blockchain validieren
app.get("/validate", (req, res) => {
  try {
    const valid = blockchain.isChainValid();
    res.json({ valid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Diagnose-Endpunkt: Netzwerkübersicht
app.get("/nodes", (req, res) => {
  res.json({
    currentNodeUrl: blockchain.currentNodeUrl,
    networkNodes: blockchain.networkNodes,
  });
});

app.post("/initialize-network", async (req, res) => {
  const nodeUrls = [
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
  ];

  try {
    // 1. Bulk-Registrierung auf allen anderen Nodes
    for (let nodeUrl of nodeUrls) {
      await rp({
        uri: nodeUrl + "/register-nodes-bulk",
        method: "POST",
        body: {
          allNetworkNodes: nodeUrls
            .filter((url) => url !== nodeUrl)
            .concat(["http://localhost:3000"]),
        },
        json: true,
      });
    }

    // 2. Auch Node 3000 selbst registriert alle anderen
    await rp({
      uri: "http://localhost:3000/register-nodes-bulk",
      method: "POST",
      body: {
        allNetworkNodes: nodeUrls,
      },
      json: true,
    });

    // 3. Optional: Wallets erzeugen + Faucet
    const senderWallet = await rp({
      uri: "http://localhost:3000/wallet",
      method: "POST",
      json: true,
    });

    const receiverWallet = await rp({
      uri: "http://localhost:3000/wallet",
      method: "POST",
      json: true,
    });

    await rp({
      uri: "http://localhost:3000/faucet",
      method: "POST",
      body: { address: senderWallet.publicKey, amount: 100 },
      json: true,
    });

    res.json({
      note: "Netzwerk erfolgreich initialisiert.",
      senderWallet,
      receiverWallet,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/consensus", async (req, res) => {
  const requestPromises = blockchain.networkNodes.map((networkNodeUrl) => {
    return rp({
      uri: networkNodeUrl + "/blockchain",
      method: "GET",
      json: true,
    });
  });

  try {
    const blockchains = await Promise.all(requestPromises);

    let maxLength = blockchain.chain.length;
    let newLongestChain = null;

    blockchains.forEach((remoteChain) => {
      if (
        remoteChain.chain.length > maxLength &&
        isValidChain(remoteChain.chain)
      ) {
        maxLength = remoteChain.chain.length;
        newLongestChain = remoteChain.chain;
      }
    });

    if (newLongestChain) {
      blockchain.chain = newLongestChain;

      // NEU: Alle geminten Transaktionen aus dem Mempool entfernen
      const confirmedTxIds = new Set();
      blockchain.chain.forEach((block) => {
        block.transactions.forEach((tx) => confirmedTxIds.add(tx.id));
      });
      mempool.transactions = mempool.transactions.filter(
        (tx) => !confirmedTxIds.has(tx.id),
      );

      res.json({
        note: "Die Chain wurde durch den Konsensmechanismus ersetzt!",
        chain: blockchain.chain,
      });
    } else {
      res.json({
        note: "Die aktuelle Chain war bereits die längste oder einzig gültige.",
        chain: blockchain.chain,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hilfsfunktion zur Chain-Validierung (Basic-Variante, gerne weiter ausbauen!)
function isValidChain(chain) {
  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const prevBlock = chain[i - 1];
    if (currentBlock.previousHash !== prevBlock.hash) return false;
    // (Optional) Hier könntest du noch Hash- und Transaktionsvalidierung ergänzen
  }
  return true;
}

// *** GANZ AM ENDE: ***
console.log("networkNode.js wird gestartet ...");
app.listen(port, () => {
  console.log(
    `Blockchain Node läuft auf Port ${port} mit URL ${currentNodeUrl}`,
  );
});
