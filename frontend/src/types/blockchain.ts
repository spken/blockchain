// API types based on the backend implementation
export interface Transaction {
  id: string; // Always present in backend (UUID)
  fromAddress: string | null;
  toAddress: string;
  amount: number;
  fee: number;
  timestamp: string;
  payload?: any; // Backend supports payload
  signature?: string;
}

export interface Block {
  timestamp: string;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
  index?: number; // Backend has block index
}

export interface Blockchain {
  chain: Block[];
  pendingTransactions: Transaction[];
  difficulty: number;
  miningReward: number;
  currentNodeUrl: string;
  networkNodes: string[];
}

export interface Wallet {
  publicKey: string;
  privateKey: string;
  created?: string; // Backend tracks creation date
}

export interface WalletBalance {
  address: string;
  balance: number;
}

export interface NetworkInfo {
  currentNodeUrl: string;
  networkNodes: string[];
}

// Backend specific response types
export interface ApiResponse {
  note?: string;
  message?: string;
  error?: string;
  [key: string]: any;
}

export interface MineResponse {
  note: string;
  block: Block;
}

export interface TransactionBroadcastResponse {
  message: string;
  transaction: Transaction;
}

export interface FaucetResponse {
  message: string;
  transaction: Transaction;
}

export interface ValidationResponse {
  valid: boolean;
}

export interface ConsensusResponse {
  note: string;
  chain: Block[];
}

export interface NetworkInitResponse {
  note: string;
  senderWallet: Wallet;
  receiverWallet: Wallet;
}
