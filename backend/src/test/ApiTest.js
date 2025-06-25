const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const apiUrl = "http://localhost:3000";

async function testAPI() {
  try {
    // 1. Neue Wallets erstellen
    const walletSender = await fetch(`${apiUrl}/wallet`, {
      method: "POST",
    }).then((res) => res.json());
    const walletReceiver = await fetch(`${apiUrl}/wallet`, {
      method: "POST",
    }).then((res) => res.json());

    console.log("Sender Wallet:", walletSender);
    console.log("Receiver Wallet:", walletReceiver);

    // 2. Initiales Guthaben via Faucet holen
    await fetch(`${apiUrl}/faucet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletSender.publicKey, amount: 100 }),
    });

    // 3. Kontostand nach Faucet
    const balanceSenderInitial = await fetch(
      `${apiUrl}/wallet/balance/${walletSender.publicKey}`,
    ).then((res) => res.json());
    console.log("Sender Balance nach Faucet:", balanceSenderInitial);

    // 4. Neue Transaktion erstellen
    await fetch(`${apiUrl}/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAddress: walletSender.publicKey,
        toAddress: walletReceiver.publicKey,
        amount: 10,
        fee: 0.05,
        privateKey: walletSender.privateKey,
      }),
    });

    console.log("Neue Transaktion erstellt.");

    // 5. Mining der Transaktion aus dem Mempool
    await fetch(`${apiUrl}/mine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        miningRewardAddress: walletSender.publicKey,
        limit: 10,
      }),
    });

    console.log("Mining mit Transaktion durchgeführt.");

    // 6. Kontostände nach Mining der Transaktion prüfen
    const balanceSenderFinal = await fetch(
      `${apiUrl}/wallet/balance/${walletSender.publicKey}`,
    ).then((res) => res.json());
    const balanceReceiverFinal = await fetch(
      `${apiUrl}/wallet/balance/${walletReceiver.publicKey}`,
    ).then((res) => res.json());

    console.log("Sender Balance nach Transaktion:", balanceSenderFinal);
    console.log("Receiver Balance nach Transaktion:", balanceReceiverFinal);

    // 7. Blockchain-Daten abrufen
    console.log(
      ">>>>>>>>>>>>>>>>>>>>>>>>>>Blockchain-Daten abrufen<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
    );

    const blockchain = await fetch(`${apiUrl}/blocks`).then((res) =>
      res.json(),
    );
    console.log("Blockchain-Daten:", blockchain);
  } catch (error) {
    console.error("Fehler während des Tests:", error);
  }
}

// Test starten
testAPI();
