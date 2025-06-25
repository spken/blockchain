import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { useWallets, useWalletBalance } from "@/hooks/useBlockchain";
import { useWalletContext } from "@/contexts/WalletContext";
import { blockchainAPI } from "@/services/api";
import { Copy, Plus, Coins } from "lucide-react";

export function WalletManager() {
  try {
    const { wallets, loading, createWallet } = useWallets();
    const { selectedWallet, setSelectedWallet } = useWalletContext();
    const [creating, setCreating] = useState(false);
    const [requesting, setRequesting] = useState(false);

    const { balance, refetch: refetchBalance } = useWalletBalance(
      selectedWallet?.publicKey || null,
    );
    const handleCreateWallet = async () => {
      try {
        setCreating(true);
        const newWallet = await createWallet();
        // Automatically select the new wallet and store its private key
        setSelectedWallet(newWallet);
      } catch (error) {
        console.error("Failed to create wallet:", error);
      } finally {
        setCreating(false);
      }
    };
    const handleRequestFaucet = async () => {
      if (!selectedWallet) return;

      try {
        setRequesting(true);
        await blockchainAPI.requestFaucet(selectedWallet.publicKey);
        await refetchBalance();
      } catch (error) {
        console.error("Failed to request faucet:", error);
      } finally {
        setRequesting(false);
      }
    };

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
    };

    const truncateAddress = (address: string, length: number = 12) => {
      return `${address.slice(0, length)}...${address.slice(-8)}`;
    };

    if (loading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading wallets...</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wallet Manager</CardTitle>
                <CardDescription>
                  Create and manage your blockchain wallets
                </CardDescription>
              </div>
              <Button onClick={handleCreateWallet} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                {creating ? "Creating..." : "New Wallet"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No wallets found. Create your first wallet to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {wallets.map((wallet, index) => (
                  <div
                    key={wallet.publicKey}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedWallet?.publicKey === wallet.publicKey
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedWallet(wallet)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Wallet #{index + 1}</Badge>
                          {selectedWallet?.publicKey === wallet.publicKey && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Public Key
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {truncateAddress(wallet.publicKey)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(wallet.publicKey);
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {selectedWallet?.publicKey === wallet.publicKey && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Balance
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-600">
                                  {balance} coins
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestFaucet();
                                  }}
                                  disabled={requesting}
                                >
                                  <Coins className="w-3 h-3 mr-1" />
                                  {requesting ? "Requesting..." : "Faucet"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>{" "}
      </div>
    );
  } catch (err) {
    return (
      <ErrorFallback
        error={err instanceof Error ? err.message : "Error in wallet manager"}
        suggestion="Try refreshing the page"
      />
    );
  }
}
