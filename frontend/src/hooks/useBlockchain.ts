import { useState, useEffect, useCallback } from "react";
import { blockchainAPI } from "@/services/api";
import { useWalletContext } from "@/contexts/WalletContext";
import type {
  Blockchain,
  Block,
  Transaction,
  Wallet,
  NetworkInfo,
} from "@/types/blockchain";

export function useBlockchain() {
  const [blockchain, setBlockchain] = useState<Blockchain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockchain = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getBlockchain();
      setBlockchain(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch blockchain",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockchain();
  }, [fetchBlockchain]);

  return {
    blockchain,
    loading,
    error,
    refetch: fetchBlockchain,
  };
}

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getBlocks();
      setBlocks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch blocks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return {
    blocks,
    loading,
    error,
    refetch: fetchBlocks,
  };
}

export function useMempool() {
  const [mempool, setMempool] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMempool = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getMempool();
      setMempool(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mempool");
    } finally {
      setLoading(false);
    }
  }, []);

  // Register for global mempool refresh events
  useGlobalMempoolRefresh(fetchMempool);

  useEffect(() => {
    fetchMempool();
    // Refresh mempool every 5 seconds
    const interval = setInterval(fetchMempool, 5000);
    return () => clearInterval(interval);
  }, [fetchMempool]);

  return {
    mempool,
    loading,
    error,
    refetch: fetchMempool,
  };
}

export function useMempoolSorted(
  sortBy: "fee" | "age" | "default" = "default",
) {
  const [mempool, setMempool] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMempool = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: Transaction[];
      switch (sortBy) {
        case "fee":
          data = await blockchainAPI.getMempoolByFees();
          break;
        case "age":
          data = await blockchainAPI.getMempoolByAge();
          break;
        default:
          data = await blockchainAPI.getMempool();
          break;
      }

      setMempool(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mempool");
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // Register for global mempool refresh events
  useGlobalMempoolRefresh(fetchMempool);

  useEffect(() => {
    fetchMempool();
    // Refresh mempool every 5 seconds
    const interval = setInterval(fetchMempool, 5000);
    return () => clearInterval(interval);
  }, [fetchMempool]);

  return {
    mempool,
    loading,
    error,
    refetch: fetchMempool,
  };
}

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { storeWallets } = useWalletContext();

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getWallets();
      setWallets(data);
      // Store private keys for all wallets in the context
      storeWallets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch wallets");
    } finally {
      setLoading(false);
    }
  }, [storeWallets]);

  const createWallet = useCallback(async (): Promise<Wallet> => {
    try {
      const newWallet = await blockchainAPI.createWallet();
      setWallets((prev) => [...prev, newWallet]);
      // Store the private key for the new wallet
      storeWallets([newWallet]);
      return newWallet;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
      throw err;
    }
  }, [storeWallets]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return {
    wallets,
    loading,
    error,
    createWallet,
    refetch: fetchWallets,
  };
}

export function useWalletBalance(address: string | null) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getWalletBalance(address);
      setBalance(data.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getPendingTransactions();
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch transactions",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  const createTransaction = useCallback(
    async (
      fromAddress: string,
      toAddress: string,
      amount: number,
      fee: number = 0,
      payload?: any,
      privateKey?: string,
    ) => {
      if (!privateKey) {
        throw new Error("Private key is required to sign the transaction");
      }

      try {
        const result = await blockchainAPI.createTransaction({
          fromAddress,
          toAddress,
          amount,
          fee,
          payload,
          privateKey,
        });
        await fetchTransactions(); // Refresh the list
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create transaction",
        );
        throw err;
      }
    },
    [fetchTransactions],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    createTransaction,
    refetch: fetchTransactions,
  };
}

export function useMining() {
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mineBlock = useCallback(
    async (rewardAddress: string, limit?: number) => {
      try {
        setMining(true);
        setError(null);
        const result = await blockchainAPI.mineBlock(rewardAddress, limit);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mine block");
        throw err;
      } finally {
        setMining(false);
      }
    },
    [],
  );

  return {
    mining,
    error,
    mineBlock,
  };
}

export function useNetwork() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<
    Record<string, "online" | "offline" | "checking">
  >({});

  const checkNodeStatus = useCallback(async (nodeUrl: string) => {
    try {
      const response = await fetch(`${nodeUrl}/blockchain`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok ? "online" : "offline";
    } catch (error) {
      return "offline";
    }
  }, []);

  const fetchNetworkInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blockchainAPI.getNetworkNodes();
      setNetworkInfo(data);

      // Check status of all nodes
      const allNodes = [data.currentNodeUrl, ...data.networkNodes];
      const statusPromises = allNodes.map(async (nodeUrl) => {
        setNodeStatuses((prev) => ({ ...prev, [nodeUrl]: "checking" }));
        const status = await checkNodeStatus(nodeUrl);
        setNodeStatuses((prev) => ({ ...prev, [nodeUrl]: status }));
        return { nodeUrl, status };
      });

      await Promise.all(statusPromises);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch network info",
      );
    } finally {
      setLoading(false);
    }
  }, [checkNodeStatus]);
  const registerNode = useCallback(
    async (newNodeUrl: string) => {
      try {
        const result = await blockchainAPI.registerAndBroadcastNode(newNodeUrl);
        await fetchNetworkInfo(); // Refresh network info
        return result;
      } catch (err) {
        throw err;
      }
    },
    [fetchNetworkInfo],
  );

  const initializeNetwork = useCallback(async () => {
    try {
      const result = await blockchainAPI.initializeNetwork();
      await fetchNetworkInfo(); // Refresh network info
      return result;
    } catch (err) {
      throw err;
    }
  }, [fetchNetworkInfo]);

  useEffect(() => {
    fetchNetworkInfo();
    // Refresh network status every 30 seconds
    const interval = setInterval(fetchNetworkInfo, 30000);
    return () => clearInterval(interval);
  }, [fetchNetworkInfo]);
  return {
    networkInfo,
    nodeStatuses,
    loading,
    error,
    refetch: fetchNetworkInfo,
    registerNode,
    initializeNetwork,
  };
}

export function useConsensus() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runConsensus = useCallback(async () => {
    try {
      setRunning(true);
      setError(null);
      const result = await blockchainAPI.runConsensus();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run consensus");
      throw err;
    } finally {
      setRunning(false);
    }
  }, []);

  return {
    running,
    error,
    runConsensus,
  };
}

export function useAutoNetworkSetup() {
  const [isAutoSetupRunning, setIsAutoSetupRunning] = useState(false);
  const [autoSetupComplete, setAutoSetupComplete] = useState(false);
  const [autoSetupError, setAutoSetupError] = useState<string | null>(null);

  const runAutoNetworkSetup = useCallback(async () => {
    if (isAutoSetupRunning || autoSetupComplete) return;

    try {
      setIsAutoSetupRunning(true);
      setAutoSetupError(null);

      console.log("🔍 Starting automatic network setup...");

      // First, check current network status
      const networkInfo = await blockchainAPI.getNetworkNodes();

      // If we already have network nodes, we're good
      if (networkInfo.networkNodes && networkInfo.networkNodes.length > 0) {
        console.log(
          "✅ Network already initialized with",
          networkInfo.networkNodes.length,
          "nodes",
        );
        setAutoSetupComplete(true);
        return {
          success: true,
          message: "Network already initialized",
          nodeCount: networkInfo.networkNodes.length,
        };
      }

      console.log("🔍 No network found, attempting to initialize network...");

      try {
        // Try to initialize the network using the backend endpoint
        const initResult = await blockchainAPI.initializeNetwork();
        console.log("🚀 Network initialization result:", initResult);

        // Run consensus to sync with the network
        console.log("🔄 Running initial consensus...");
        await blockchainAPI.runConsensus();

        console.log("✅ Auto network setup completed successfully!");
        setAutoSetupComplete(true);

        return {
          success: true,
          message: "Network initialized successfully",
          nodeCount: 5, // Backend initializes with predefined nodes (3001-3004)
        };
      } catch (initError) {
        console.log(
          "ℹ️ Network initialization failed, running in single-node mode",
        );
        setAutoSetupComplete(true);
        return {
          success: true,
          message: "Running in single-node mode",
          nodeCount: 1,
          singleNode: true,
        };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to setup network automatically";
      console.error("❌ Auto network setup failed:", errorMessage);
      setAutoSetupError(errorMessage);
      throw err;
    } finally {
      setIsAutoSetupRunning(false);
    }
  }, [isAutoSetupRunning, autoSetupComplete]);

  return {
    isAutoSetupRunning,
    autoSetupComplete,
    autoSetupError,
    runAutoNetworkSetup,
  };
}

// Global mempool refresh event system
const mempoolRefreshListeners = new Set<() => void>();

export function useMempoolRefresh() {
  const triggerGlobalMempoolRefresh = useCallback(() => {
    mempoolRefreshListeners.forEach((listener) => listener());
  }, []);

  return { triggerGlobalMempoolRefresh };
}

function useGlobalMempoolRefresh(refreshFn: () => void) {
  useEffect(() => {
    mempoolRefreshListeners.add(refreshFn);
    return () => {
      mempoolRefreshListeners.delete(refreshFn);
    };
  }, [refreshFn]);
}
