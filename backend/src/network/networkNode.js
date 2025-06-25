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
  try {
    const { miningRewardAddress, limit } = req.body;

    if (!miningRewardAddress) {
      return res.status(400).json({
        message: "Mining reward address is required",
      });
    }

    // Get transactions from mempool and add them to pending transactions
    const transactionsToMine = mempool.getTransactionsSortedByFee(limit || 10);
    transactionsToMine.forEach((tx) => {
      try {
        blockchain.createTransaction(tx);
      } catch (error) {
        console.log(`Failed to add transaction ${tx.id}: ${error.message}`);
      }
    });

    // Mine the block (this will add the mining reward transaction internally)
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
      }).catch((err) => {
        console.log(`Failed to broadcast to ${networkNodeUrl}: ${err.message}`);
        return { error: err.message, nodeUrl: networkNodeUrl };
      });
    });

    try {
      const results = await Promise.all(requestPromises);

      // Count successful vs failed broadcasts
      const successful = results.filter((result) => !result.error);
      const failed = results.filter((result) => result.error);

      console.log(
        `Broadcasting results: ${successful.length} successful, ${failed.length} failed`,
      );

      if (failed.length > 0) {
        console.log(
          "Failed broadcasts:",
          failed.map((f) => `${f.nodeUrl}: ${f.error}`).join(", "),
        );
      }

      // If at least some broadcasts succeeded, or if this is a single-node network
      if (successful.length > 0 || blockchain.networkNodes.length === 0) {
        res.json({
          message:
            blockchain.networkNodes.length === 0
              ? "Block erfolgreich gemint (kein Netzwerk für Broadcasting)"
              : `Block erfolgreich gemint und an ${successful.length}/${blockchain.networkNodes.length} Nodes gesendet.`,
          block: newBlock,
          broadcastStats: {
            successful: successful.length,
            failed: failed.length,
            total: blockchain.networkNodes.length,
          },
        });
      } else {
        // All broadcasts failed, but block was still mined
        res.json({
          message:
            "Block erfolgreich gemint, aber Broadcasting an alle Nodes fehlgeschlagen.",
          block: newBlock,
          broadcastError: "All broadcasts failed",
          broadcastStats: {
            successful: 0,
            failed: failed.length,
            total: blockchain.networkNodes.length,
          },
        });
      }
    } catch (err) {
      // This shouldn't happen since we're catching individual promise errors
      console.log("Unexpected broadcasting error:", err.message);
      res.json({
        message:
          "Block erfolgreich gemint, aber unerwarteter Broadcasting-Fehler.",
        block: newBlock,
        broadcastError: err.message,
      });
    }
  } catch (error) {
    console.error("Mining error:", error);
    res.status(500).json({
      message: "Fehler beim Mining des Blocks",
      error: error.message,
    });
  }
});

// Broadcast eines neuen Blocks an alle Nodes
app.post("/receive-new-block", async (req, res) => {
  try {
    const newBlock = req.body.newBlock;
    const lastBlock = blockchain.getLatestBlock();

    // Validate that the new block's previousHash matches the last block's hash
    const correctHash = lastBlock.hash === newBlock.previousHash;

    // Additional validation: check if the block is valid
    const blockIsValid =
      newBlock.hash && newBlock.previousHash && newBlock.transactions;

    if (correctHash && blockIsValid) {
      // Convert transactions back to Transaction instances if needed
      const transactions = newBlock.transactions.map((tx) => {
        if (!(tx instanceof Transaction)) {
          const transaction = new Transaction(
            tx.fromAddress,
            tx.toAddress,
            tx.amount,
            tx.fee,
            tx.payload,
            tx.id,
          );
          transaction.timestamp = tx.timestamp;
          transaction.signature = tx.signature;
          return transaction;
        }
        return tx;
      });

      // Create a new Block instance with the proper transactions
      const blockToAdd = {
        timestamp: newBlock.timestamp,
        transactions: transactions,
        previousHash: newBlock.previousHash,
        nonce: newBlock.nonce,
        hash: newBlock.hash,
      };

      blockchain.chain.push(blockToAdd);
      blockchain.pendingTransactions = [];

      console.log(`New block accepted and added: ${newBlock.hash}`);
      res.json({
        note: "Neuer Block akzeptiert und hinzugefügt",
        block: newBlock,
      });
    } else if (!correctHash) {
      // Fork detected! Try to resolve by running consensus
      console.log(
        `Fork detected. Last block hash: ${lastBlock.hash}, New block previousHash: ${newBlock.previousHash}`,
      );
      console.log(`Attempting to resolve fork through consensus...`);

      try {
        // Run consensus to get the longest chain from the network
        const requestPromises = blockchain.networkNodes.map(
          (networkNodeUrl) => {
            return rp({
              uri: networkNodeUrl + "/blockchain",
              method: "GET",
              json: true,
            }).catch((err) => {
              console.log(
                `Failed to get blockchain from ${networkNodeUrl}: ${err.message}`,
              );
              return null;
            });
          },
        );

        const blockchains = await Promise.all(requestPromises);
        const validBlockchains = blockchains.filter((bc) => bc !== null);

        let maxLength = blockchain.chain.length;
        let newLongestChain = null;
        let longestChainSource = null;

        // Check if any remote chain is longer and valid
        validBlockchains.forEach((remoteChain, index) => {
          if (
            remoteChain &&
            remoteChain.chain &&
            remoteChain.chain.length > maxLength &&
            isValidChain(remoteChain.chain)
          ) {
            maxLength = remoteChain.chain.length;
            newLongestChain = remoteChain.chain;
            longestChainSource = blockchain.networkNodes[index];
          }
        });

        // Also check if the incoming block would create a valid longer chain
        const tempChain = [...blockchain.chain, newBlock];
        if (tempChain.length > maxLength && isValidChain(tempChain)) {
          maxLength = tempChain.length;
          newLongestChain = tempChain;
          longestChainSource = "incoming block";
        }

        if (newLongestChain) {
          blockchain.chain = newLongestChain;
          blockchain.pendingTransactions = [];

          // Clean up mempool
          const confirmedTxIds = new Set();
          blockchain.chain.forEach((block) => {
            block.transactions.forEach((tx) => confirmedTxIds.add(tx.id));
          });
          mempool.transactions = mempool.transactions.filter(
            (tx) => !confirmedTxIds.has(tx.id),
          );

          console.log(
            `Fork resolved! Adopted longer chain from ${longestChainSource}. New length: ${blockchain.chain.length}`,
          );
          res.json({
            note: "Fork aufgelöst - längere Chain übernommen",
            block: newBlock,
            chainLength: blockchain.chain.length,
            source: longestChainSource,
          });
        } else {
          console.log(`Fork resolution failed - no longer valid chain found`);
          res.status(400).json({
            note: "Block abgelehnt - Fork konnte nicht aufgelöst werden",
            block: newBlock,
            reason: "No longer valid chain available",
            currentChainLength: blockchain.chain.length,
          });
        }
      } catch (consensusError) {
        console.error("Error during fork resolution:", consensusError);
        res.status(400).json({
          note: "Block abgelehnt - Fork-Auflösung fehlgeschlagen",
          block: newBlock,
          reason: "Fork resolution failed",
          error: consensusError.message,
        });
      }
    } else {
      console.log(`Block rejected due to validation failure`);
      res.status(400).json({
        note: "Block abgelehnt - Validierung fehlgeschlagen",
        block: newBlock,
        reason: "Block validation failed",
      });
    }
  } catch (error) {
    console.error("Error processing new block:", error);
    res.status(500).json({
      note: "Fehler beim Verarbeiten des neuen Blocks",
      error: error.message,
    });
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

// Initialisierungsendpunkt
app.post("/initialize-network", async (req, res) => {
  console.log(`initialize-network aufgerufen`);

  try {
    // 1. Automatische Erkennung verfügbarer Nodes auf Ports 3000-3004
    const allPossiblePorts = [3000, 3001, 3002, 3003, 3004];
    const availableNodes = [];

    console.log("Suche nach verfügbaren Nodes...");

    // Überprüfe jeden Port auf Verfügbarkeit
    for (let port of allPossiblePorts) {
      const nodeUrl = `http://localhost:${port}`;
      try {
        // Teste ob der Node erreichbar ist mit einem Timeout
        const response = await rp({
          uri: nodeUrl + "/blockchain",
          method: "GET",
          json: true,
          timeout: 2000, // 2 Sekunden Timeout
        });

        if (response) {
          availableNodes.push(nodeUrl);
          console.log(`✓ Node gefunden: ${nodeUrl}`);
        }
      } catch (error) {
        console.log(`✗ Node nicht erreichbar: ${nodeUrl} (${error.message})`);
      }
    }

    if (availableNodes.length < 2) {
      return res.status(400).json({
        error:
          "Mindestens 2 Nodes müssen laufen für die Netzwerk-Initialisierung",
        availableNodes: availableNodes,
        suggestion: "Starte weitere Nodes auf Ports 3000-3004",
      });
    }

    console.log(
      `${availableNodes.length} verfügbare Nodes gefunden:`,
      availableNodes,
    );

    // 2. Bulk-Registrierung auf allen verfügbaren Nodes
    for (let nodeUrl of availableNodes) {
      console.log(`Registriere Netzwerk auf ${nodeUrl}...`);
      try {
        await rp({
          uri: nodeUrl + "/register-nodes-bulk",
          method: "POST",
          body: {
            allNetworkNodes: availableNodes.filter((url) => url !== nodeUrl),
          },
          json: true,
          timeout: 5000,
        });
        console.log(`✓ Erfolgreich registriert: ${nodeUrl}`);
      } catch (error) {
        console.log(
          `✗ Registrierung fehlgeschlagen: ${nodeUrl} (${error.message})`,
        );
      }
    }

    // 3. Wallets auf dem ersten verfügbaren Node erzeugen
    const primaryNode = availableNodes[0];
    console.log(`Erstelle Wallets auf primärem Node: ${primaryNode}`);

    const senderWallet = await rp({
      uri: primaryNode + "/wallet",
      method: "POST",
      json: true,
      timeout: 5000,
    });

    const receiverWallet = await rp({
      uri: primaryNode + "/wallet",
      method: "POST",
      json: true,
      timeout: 5000,
    });

    // 4. Faucet für den Sender (Guthaben aufladen)
    console.log(
      `Lade Guthaben für Sender-Wallet auf: ${senderWallet.publicKey}`,
    );
    await rp({
      uri: primaryNode + "/faucet",
      method: "POST",
      body: { address: senderWallet.publicKey, amount: 100 },
      json: true,
      timeout: 5000,
    });

    res.json({
      success: true,
      message: "Netzwerk erfolgreich initialisiert.",
      networkInfo: {
        totalNodes: availableNodes.length,
        availableNodes: availableNodes,
        primaryNode: primaryNode,
      },
      wallets: {
        sender: senderWallet,
        receiver: receiverWallet,
      },
    });
  } catch (error) {
    console.error("Fehler bei Netzwerk-Initialisierung:", error.message);
    res.status(500).json({
      error: error.message,
      details: "Fehler bei der automatischen Netzwerk-Initialisierung",
    });
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

// Hilfsfunktion: Verfügbare Nodes scannen (ohne Initialisierung)
app.get("/scan-nodes", async (req, res) => {
  console.log("Scanning für verfügbare Nodes...");

  try {
    const allPossiblePorts = [3000, 3001, 3002, 3003, 3004];
    const scanResults = [];

    for (let port of allPossiblePorts) {
      const nodeUrl = `http://localhost:${port}`;
      const result = {
        url: nodeUrl,
        port: port,
        status: "offline",
        error: null,
      };

      try {
        const response = await rp({
          uri: nodeUrl + "/blockchain",
          method: "GET",
          json: true,
          timeout: 2000,
        });

        if (response) {
          result.status = "online";
          result.chainLength = response.chain ? response.chain.length : 0;
          result.networkNodes = response.networkNodes
            ? response.networkNodes.length
            : 0;
        }
      } catch (error) {
        result.status = "offline";
        result.error = error.message;
      }

      scanResults.push(result);
    }

    const onlineNodes = scanResults.filter((node) => node.status === "online");

    res.json({
      timestamp: new Date().toISOString(),
      totalScanned: scanResults.length,
      onlineCount: onlineNodes.length,
      offlineCount: scanResults.length - onlineNodes.length,
      nodes: scanResults,
      readyForNetwork: onlineNodes.length >= 2,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: "Fehler beim Scannen der Nodes",
    });
  }
});

// *** GANZ AM ENDE: ***
console.log("networkNode.js wird gestartet ...");
app.listen(port, () => {
  console.log(
    `Blockchain Node läuft auf Port ${port} mit URL ${currentNodeUrl}`,
  );
});
