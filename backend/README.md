Klasse Block Verbesserungen:

    Timestamp klar formatieren (z.B. ISO-Format), um die Lesbarkeit und Nachvollziehbarkeit zu erhöhen
    Fehler-Handling in mineBlock verbessern:
Prüfen, ob Difficulty realistisch ist (z.B. zwischen 1 und 6).


Klasse Blockchain Verbesserungen:

    Validierung einzelner Transaktionen vor dem Mining:
    Methode zur Abfrage einzelner Blöcke hinzufügen (hilfreich für APIs):
    Balance Validierung bei der Erstellung einer Transaktion

Klasse Transaction Verbesserungen:

    Bessere Fehlerbeschreibungen:
    Transaktion mit Datum versehen (hilft bei der Nachvollziehbarkeit):
    Die Transaction-Klasse wurde um eine optionale Gebühr (fee) erweitert, sodass du nun realistischere Transaktionskosten simulieren kannst.

Klasse Mempool

Gebührenbasierte Sortierung:
Transaktionen können gezielt nach Gebühren sortiert werden, sodass Miner die profitabelsten Transaktionen zuerst aufnehmen.

Einfache Handhabung:
Leicht verständliche Methoden zum Hinzufügen, Entfernen und Abfragen von Transaktionen.

Duplikat-Erkennung:
Schutz gegen doppelte Transaktionen (durch Hashprüfung).

KLasse Wallet

        Trennt Schlüsselverwaltung logisch von Transaktionslogik und Blockchain-Struktur.
        Verdeutlicht klar die Unterscheidung zwischen öffentlichen und privaten Schlüsseln.

        Erleichtert das Verständnis über die Funktionsweise von Wallets in echten Blockchains.
        Saubere, modulare Trennung der Verantwortlichkeiten.

        Erleichtert Erweiterungen (z.B. zusätzliche Sicherheitsfeatures, Schlüsselmanagement).
        

CHanges 06.06.2025
added function getTransactionsSortedByAge in class Mempool

getTransactionsSortedByAge(limit = 10) {
    return this.transactions
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(0, limit);
  }
