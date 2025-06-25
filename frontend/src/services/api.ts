import type {
  Blockchain,
  Block,
  Transaction,
  Wallet,
  WalletBalance,
  NetworkInfo,
  MineResponse,
  TransactionBroadcastResponse,
  FaucetResponse,
  ValidationResponse,
  ConsensusResponse,
  NetworkInitResponse,
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
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          errorJson.error || errorJson.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
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

  async validateBlockchain(): Promise<ValidationResponse> {
    return this.request<ValidationResponse>("/validate");
  }

  // Transaction endpoints - matching backend exactly
  async createTransaction(transactionData: {
    fromAddress: string;
    toAddress: string;
    amount: number;
    fee?: number;
    payload?: any;
    privateKey: string;
    id?: string;
  }): Promise<TransactionBroadcastResponse> {
    return this.request<TransactionBroadcastResponse>(
      "/transaction/broadcast",
      {
        method: "POST",
        body: JSON.stringify(transactionData),
      },
    );
  }

  async sendTransaction(
    transaction: Transaction,
  ): Promise<{ message: string; transaction: Transaction }> {
    return this.request<{ message: string; transaction: Transaction }>(
      "/transaction",
      {
        method: "POST",
        body: JSON.stringify(transaction),
      },
    );
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>("/transactions/pending");
  }

  // Mining endpoints - matching backend exactly
  async mineBlock(
    rewardAddress: string,
    limit?: number,
  ): Promise<MineResponse> {
    return this.request<MineResponse>("/mine", {
      method: "POST",
      body: JSON.stringify({
        miningRewardAddress: rewardAddress,
        limit: limit,
      }),
    });
  }

  // Mempool endpoints - backend returns Transaction[] directly
  async getMempool(): Promise<Transaction[]> {
    return this.request<Transaction[]>("/mempool");
  }

  async getMempoolByFees(): Promise<Transaction[]> {
    return this.request<Transaction[]>("/mempool/fees");
  }

  async getMempoolByAge(): Promise<Transaction[]> {
    return this.request<Transaction[]>("/mempool/age");
  }

  // Wallet endpoints - matching backend exactly
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

  async requestFaucet(
    address: string,
    amount?: number,
  ): Promise<FaucetResponse> {
    return this.request<FaucetResponse>("/faucet", {
      method: "POST",
      body: JSON.stringify({ address, amount }),
    });
  }

  // Network endpoints - matching backend exactly
  async getNetworkNodes(): Promise<NetworkInfo> {
    return this.request<NetworkInfo>("/nodes");
  }

  async registerAndBroadcastNode(
    newNodeUrl: string,
  ): Promise<{ note: string }> {
    return this.request<{ note: string }>("/register-and-broadcast-node", {
      method: "POST",
      body: JSON.stringify({ newNodeUrl }),
    });
  }

  async registerNode(newNodeUrl: string): Promise<{ note: string }> {
    return this.request<{ note: string }>("/register-node", {
      method: "POST",
      body: JSON.stringify({ newNodeUrl }),
    });
  }

  async registerNodesBulk(
    allNetworkNodes: string[],
  ): Promise<{ note: string }> {
    return this.request<{ note: string }>("/register-nodes-bulk", {
      method: "POST",
      body: JSON.stringify({ allNetworkNodes }),
    });
  }

  async initializeNetwork(): Promise<NetworkInitResponse> {
    return this.request<NetworkInitResponse>("/initialize-network", {
      method: "POST",
    });
  }

  // Consensus endpoints - matching backend exactly
  async runConsensus(): Promise<ConsensusResponse> {
    return this.request<ConsensusResponse>("/consensus");
  }

  // Utility method for testing connectivity
  async testConnection(): Promise<boolean> {
    try {
      await this.getNetworkNodes();
      return true;
    } catch {
      return false;
    }
  }
}

export const blockchainAPI = new BlockchainAPI();
export default blockchainAPI;
