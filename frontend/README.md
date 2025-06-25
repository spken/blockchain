# Blockchain Frontend

A modern React frontend for interacting with the blockchain network, built with Vite, Tailwind CSS, and shadcn/ui components.

## Features

- **Blockchain Explorer**: View all blocks in the chain with detailed information
- **Wallet Management**: Create and manage blockchain wallets, check balances
- **Transaction Manager**: Send transactions and view pending transactions
- **Mining Interface**: Mine new blocks and earn mining rewards
- **Mempool Viewer**: Monitor transactions waiting to be mined
- **Network Status**: Real-time blockchain statistics and validation

## Prerequisites

- Node.js (v16 or higher)
- A running blockchain backend node (see backend README)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure the backend API URL:
   - Update `VITE_API_BASE_URL` in `.env`
   - Default: `http://localhost:3001`

## Development

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

## Usage Guide

### 1. Overview Tab

- View blockchain statistics
- See latest block information
- Validate blockchain integrity

### 2. Blocks Tab

- Browse all blocks in the blockchain
- View block details and transactions

### 3. Wallets Tab

- Create new wallets
- View wallet balances
- Request test coins from faucet

### 4. Transactions Tab

- Create new transactions
- View pending transactions

### 5. Mining Tab

- Mine new blocks and earn rewards
- View mining progress

### 6. Mempool Tab

- Monitor pending transactions
- View transaction fees and statistics

## Architecture

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Lucide React** icons
