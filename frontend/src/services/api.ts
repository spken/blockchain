import type {
  Blockchain,
  Block,
  Transaction,
  Wallet,
  WalletBalance,
  MempoolTransaction,
  NetworkInfo,
} from "@/types/blockchain";

// Default to localhost for development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

class BlockchainAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Blockchain endpoints
  async getBlockchain(): Promise<Blockchain> {
    return this.request<Blockchain>("/blockchain");
  }

  async getBlocks(): Promise<Block[]> {
    return this.request<Block[]>("/blocks");
  }

  async getBlockByHash(hash: string): Promise<Block> {
    return this.request<Block>(`/blocks/${hash}`);
  }
  async validateBlockchain(): Promise<{ isValid: boolean; message?: string }> {
    const response = await this.request<{ valid: boolean }>("/validate");
    return { isValid: response.valid };
  }
  // Transaction endpoints
  async createTransaction(transactionData: {
    fromAddress: string;
    toAddress: string;
    amount: number;
    fee?: number;
    payload?: any;
    privateKey: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>("/transaction/broadcast", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  }

  async broadcastTransaction(
    transaction: Transaction,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>("/transaction/broadcast", {
      method: "POST",
      body: JSON.stringify(transaction),
    });
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>("/transactions/pending");
  }
  // Mining endpoints
  async mineBlock(
    rewardAddress: string,
  ): Promise<{ message: string; block: Block }> {
    return this.request<{ message: string; block: Block }>("/mine", {
      method: "POST",
      body: JSON.stringify({ miningRewardAddress: rewardAddress }),
    });
  }

  // Mempool endpoints
  async getMempool(): Promise<MempoolTransaction[]> {
    return this.request<MempoolTransaction[]>("/mempool");
  }

  async getMempoolByFees(): Promise<MempoolTransaction[]> {
    return this.request<MempoolTransaction[]>("/mempool/fees");
  }

  async getMempoolByAge(): Promise<MempoolTransaction[]> {
    return this.request<MempoolTransaction[]>("/mempool/age");
  }

  // Wallet endpoints
  async createWallet(): Promise<Wallet> {
    return this.request<Wallet>("/wallet", {
      method: "POST",
    });
  }

  async getWallets(): Promise<Wallet[]> {
    return this.request<Wallet[]>("/wallets");
  }

  async getWalletBalance(address: string): Promise<WalletBalance> {
    return this.request<WalletBalance>(`/wallet/balance/${address}`);
  }

  async requestFaucet(address: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/faucet", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }
  // Network endpoints
  async getNetworkNodes(): Promise<NetworkInfo> {
    return this.request<NetworkInfo>("/nodes");
  }

  async scanNodes(): Promise<{
    timestamp: string;
    totalScanned: number;
    onlineCount: number;
    offlineCount: number;
    nodes: Array<{
      url: string;
      port: number;
      status: "online" | "offline";
      error?: string;
      chainLength?: number;
      networkNodes?: number;
    }>;
    readyForNetwork: boolean;
  }> {
    return this.request("/scan-nodes");
  }

  async registerNode(newNodeUrl: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/register-and-broadcast-node", {
      method: "POST",
      body: JSON.stringify({ newNodeUrl }),
    });
  }

  async initializeNetwork(nodeUrls: string[]): Promise<{ message: string }> {
    return this.request<{ message: string }>("/initialize-network", {
      method: "POST",
      body: JSON.stringify({ nodeUrls }),
    });
  }

  // Consensus endpoints
  async runConsensus(): Promise<{
    note: string;
    chain: Block[];
    wasReplaced?: boolean;
  }> {
    return this.request<{
      note: string;
      chain: Block[];
      wasReplaced?: boolean;
    }>("/consensus");
  }
}

export const blockchainAPI = new BlockchainAPI();
export default blockchainAPI;
