# Verbesserungen der Blockchain-Klassen

## Klasse `Block`

**Verbesserungen:**

- **Timestamp klar formatieren**  
  Verwende ein standardisiertes Format wie ISO 8601 zur besseren Lesbarkeit und Nachvollziehbarkeit.
- **Fehler-Handling in `mineBlock` verbessern**
  - Prüfung, ob der Schwierigkeitsgrad (`difficulty`) realistisch ist (z. B. zwischen 1 und 6).

---

## Klasse `Blockchain`

**Verbesserungen:**

- **Validierung einzelner Transaktionen vor dem Mining**  
  Sicherstellen, dass alle Transaktionen korrekt sind, bevor sie gemined werden.
- **Methode zur Abfrage einzelner Blöcke hinzufügen**  
  Nützlich für API-Zugriffe und gezielte Blockrecherchen.
- **Balance-Validierung bei der Erstellung einer Transaktion**  
  Überprüfen, ob der Sender über ausreichend Guthaben verfügt.

---

## Klasse `Transaction`

**Verbesserungen:**

- **Bessere Fehlerbeschreibungen**  
  Präzisere und hilfreichere Fehlermeldungen zur Erleichterung der Fehlersuche.
- **Transaktion mit Datum versehen**  
  Hinzufügen eines Timestamps zur besseren Nachvollziehbarkeit.
- **Optionale Gebühr (`fee`)**  
  Realistischere Simulation durch Einführung einer optionalen Transaktionsgebühr.

---

## Klasse `Mempool`

**Verbesserungen:**

- **Gebührenbasierte Sortierung**  
  Transaktionen können nach Höhe der Gebühr sortiert werden, um profitablere Transaktionen zuerst zu minen.
- **Einfache Handhabung**  
  Methoden zum Hinzufügen, Entfernen und Abfragen von Transaktionen sind klar und verständlich.
- **Duplikat-Erkennung**  
  Schutz vor doppelten Transaktionen mittels Hashprüfung.

---

## Klasse `Wallet`

**Verbesserungen:**

- **Klare Trennung der Verantwortlichkeiten**
  - Schlüsselverwaltung ist getrennt von der Logik der Transaktion und der Blockchain-Struktur.
  - Verdeutlicht den Unterschied zwischen öffentlichen und privaten Schlüsseln.
- **Erleichtert das Verständnis**  
  Bessere Nachvollziehbarkeit der Funktionsweise echter Wallets.
- **Modularität für Erweiterungen**  
  Gute Basis für zusätzliche Features wie Sicherheitsmechanismen oder Schlüsselmanagement.

---

## Änderungen vom 06.06.2025

**Neue Funktion in Klasse `Mempool`:**  
`getTransactionsSortedByAge(limit = 10)`

```js
getTransactionsSortedByAge(limit = 10) {
  return this.transactions
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(0, limit);
}
```
