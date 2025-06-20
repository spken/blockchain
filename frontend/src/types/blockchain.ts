// API types based on the backend implementation
export interface Transaction {
  id?: string
  fromAddress: string | null
  toAddress: string
  amount: number
  fee: number
  timestamp: string
  payload?: any
  signature?: string
}

export interface Block {
  timestamp: string
  transactions: Transaction[]
  previousHash: string
  hash: string
  nonce: number
}

export interface Blockchain {
  chain: Block[]
  pendingTransactions: Transaction[]
  difficulty: number
  miningReward: number
  currentNodeUrl: string
  networkNodes: string[]
}

export interface Wallet {
  publicKey: string
  privateKey: string
}

export interface WalletBalance {
  balance: number
}

export interface MempoolTransaction {
  transaction: Transaction
  timestamp: string
  fees: number
}

export interface NetworkNode {
  url: string
  status: 'online' | 'offline'
}

export interface NetworkInfo {
  currentNodeUrl: string
  networkNodes: string[]
}
