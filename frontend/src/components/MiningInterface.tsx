import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { useMining, useBlockchain, useConsensus, useMempoolRefresh } from "@/hooks/useBlockchain";
import { useWalletContext } from "@/contexts/WalletContext";
import { blockchainAPI } from "@/services/api";
import type { Wallet } from "@/types/blockchain";
import {
  Pickaxe,
  Loader2,
  Wallet as WalletIcon,
  RefreshCw,
} from "lucide-react";

export function MiningInterface() {
  try {
    const { mining, mineBlock } = useMining();
    const { refetch: refetchBlockchain } = useBlockchain();
    const { runConsensus, running: consensusRunning } = useConsensus();
    const { triggerGlobalMempoolRefresh } = useMempoolRefresh();
    const { selectedWallet } = useWalletContext();

    const [message, setMessage] = useState<{
      type: "success" | "error" | "info";
      text: string;
    } | null>(null);
    const [availableWallets, setAvailableWallets] = useState<Wallet[]>([]);
    const [selectedMiningWallet, setSelectedMiningWallet] =
      useState<string>("");
    const [loadingWallets, setLoadingWallets] = useState(false);
    const [transactionLimit, setTransactionLimit] = useState<number>(10);

    // Load available wallets
    useEffect(() => {
      const fetchWallets = async () => {
        try {
          setLoadingWallets(true);
          const wallets = await blockchainAPI.getWallets();
          setAvailableWallets(wallets);

          // Auto-select the selected wallet if available
          if (
            selectedWallet &&
            wallets.some((w) => w.publicKey === selectedWallet.publicKey)
          ) {
            setSelectedMiningWallet(selectedWallet.publicKey);
          } else if (wallets.length > 0) {
            setSelectedMiningWallet(wallets[0].publicKey);
          }
        } catch (error) {
          console.error("Failed to fetch wallets:", error);
        } finally {
          setLoadingWallets(false);
        }
      };
      fetchWallets();
    }, [selectedWallet]);

    const handleMine = async () => {
      if (!selectedMiningWallet) {
        setMessage({
          type: "error",
          text: "Please select a wallet to receive mining rewards",
        });
        return;
      }

      try {
        setMessage(null);

        // First, run consensus to sync with the network
        setMessage({ type: "info", text: "Synchronizing with network..." });
        const consensusResult = await runConsensus();

        if (consensusResult.note.includes("ersetzt")) {
          setMessage({
            type: "info",
            text: "Blockchain synchronized. Starting mining...",
          });
        } else {
          setMessage({
            type: "info",
            text: "Already synchronized. Starting mining...",
          });
        }

        // Then mine the block with transaction limit
        const result = await mineBlock(selectedMiningWallet, transactionLimit);
        setMessage({
          type: "success",
          text: `Block mined successfully! ${result.note || "Hash: " + (result.block?.hash?.slice(0, 16) + "..." || "Unknown")}`,
        });
        await refetchBlockchain();
        // Refresh mempool immediately since transactions were removed
        triggerGlobalMempoolRefresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to mine block",
        });
      }
    };

    const truncateAddress = (address: string, length: number = 12) => {
      return `${address.slice(0, length)}...${address.slice(-8)}`;
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pickaxe className="w-5 h-5" />
            Mining Interface
          </CardTitle>
          <CardDescription>Mine a new block and earn rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mining Reward Wallet
            </label>
            {loadingWallets ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600">Loading wallets...</p>
              </div>
            ) : availableWallets.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedMiningWallet}
                  onChange={(e) => setSelectedMiningWallet(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a wallet...</option>
                  {availableWallets.map((wallet) => (
                    <option key={wallet.publicKey} value={wallet.publicKey}>
                      {truncateAddress(wallet.publicKey)}{" "}
                      {wallet.publicKey === selectedWallet?.publicKey
                        ? "(Active)"
                        : ""}
                    </option>
                  ))}
                </select>
                {selectedMiningWallet && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                    <WalletIcon className="w-3 h-3 inline mr-1" />
                    Mining rewards will be sent to:{" "}
                    {truncateAddress(selectedMiningWallet)}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No wallets found. Please create a wallet in the Wallets tab
                  first.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Limit
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              value={transactionLimit}
              onChange={(e) =>
                setTransactionLimit(parseInt(e.target.value) || 10)
              }
              placeholder="Number of transactions to include (default: 10)"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of transactions to include in the mined block
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : message.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              Mining Information
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Mining difficulty is set automatically by the network</li>
              <li>• Successful mining rewards you with coins</li>
              <li>• Mining includes pending transactions in the new block</li>
              <li>
                • Transaction limit controls how many transactions to include
              </li>
              <li>• The process may take some time depending on difficulty</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleMine}
              disabled={mining || consensusRunning || !selectedMiningWallet}
              className="min-w-[120px]"
            >
              {mining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mining...
                </>
              ) : consensusRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Pickaxe className="w-4 h-4 mr-2" />
                  Start Mining
                </>
              )}
            </Button>
          </div>

          {(mining || consensusRunning) && (
            <div className="text-center">
              <Badge variant="secondary" className="animate-pulse">
                {consensusRunning
                  ? "Synchronizing with network..."
                  : "Mining in progress... This may take a while"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  } catch (err) {
    return (
      <ErrorFallback
        error={err instanceof Error ? err.message : "Error in mining interface"}
        suggestion="Try refreshing the page"
      />
    );
  }
}
