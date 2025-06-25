import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Wallet } from "@/types/blockchain";

interface WalletContextType {
  selectedWallet: Wallet | null;
  setSelectedWallet: (wallet: Wallet | null) => void;
  getPrivateKey: (publicKey: string) => string | null;
  storeWallets: (wallets: Wallet[]) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [walletStore, setWalletStore] = useState<Map<string, string>>(
    new Map(),
  );

  const handleSetSelectedWallet = useCallback((wallet: Wallet | null) => {
    setSelectedWallet(wallet);
    if (wallet) {
      // Store the private key mapping
      setWalletStore(
        (prev) => new Map(prev.set(wallet.publicKey, wallet.privateKey)),
      );
    }
  }, []);

  const getPrivateKey = useCallback(
    (publicKey: string) => {
      return walletStore.get(publicKey) || null;
    },
    [walletStore],
  );

  const storeWallets = useCallback((wallets: Wallet[]) => {
    setWalletStore((prev) => {
      const newStore = new Map(prev);
      wallets.forEach((wallet) => {
        if (wallet.privateKey) {
          newStore.set(wallet.publicKey, wallet.privateKey);
        }
      });
      return newStore;
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        selectedWallet,
        setSelectedWallet: handleSetSelectedWallet,
        getPrivateKey,
        storeWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
