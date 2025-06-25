import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { Transaction } from "@/types/blockchain";
import { blockchainAPI } from "@/services/api";

interface MempoolContextType {
  mempool: Transaction[];
  loading: boolean;
  error: string | null;
  refetchMempool: () => Promise<void>;
}

const MempoolContext = createContext<MempoolContextType | undefined>(undefined);

export function MempoolProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    fetchMempool();
    // Refresh mempool every 5 seconds
    const interval = setInterval(fetchMempool, 5000);
    return () => clearInterval(interval);
  }, [fetchMempool]);

  return (
    <MempoolContext.Provider
      value={{
        mempool,
        loading,
        error,
        refetchMempool: fetchMempool,
      }}
    >
      {children}
    </MempoolContext.Provider>
  );
}

export function useMempoolContext() {
  const context = useContext(MempoolContext);
  if (context === undefined) {
    throw new Error("useMempoolContext must be used within a MempoolProvider");
  }
  return context;
}
