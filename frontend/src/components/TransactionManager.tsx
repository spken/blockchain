import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { useTransactions, useWallets, useMempoolRefresh, useWalletBalance, useMempool } from "@/hooks/useBlockchain";
import { useWalletContext } from "@/contexts/WalletContext";
import { Send, DollarSign, Eye } from "lucide-react";

export function TransactionForm({
  onSwitchToMempool,
}: {
  onSwitchToMempool?: () => void;
}) {
  try {
    const { wallets } = useWallets();
    const { createTransaction } = useTransactions();
    const { triggerGlobalMempoolRefresh } = useMempoolRefresh();
    const { getPrivateKey } = useWalletContext();
    const { mempool } = useMempool();

    const [fromAddress, setFromAddress] = useState("");
    const [toAddress, setToAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [fee, setFee] = useState("0");
    const [payload, setPayload] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

    // Get balance for the selected from address
    const { balance: currentBalance, loading: balanceLoading } = useWalletBalance(fromAddress || null);

    // Calculate available balance considering pending transactions
    const calculateAvailableBalance = (address: string) => {
      if (!address || !mempool) return currentBalance;
      
      // Calculate total amount being spent in pending transactions from this address
      const pendingSpent = mempool
        .filter(tx => tx.fromAddress === address)
        .reduce((total, tx) => total + tx.amount + tx.fee, 0);
      
      return currentBalance - pendingSpent;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!fromAddress || !toAddress || !amount) {
        setMessage({
          type: "error",
          text: "Please fill in all required fields",
        });
        return;
      }

      if (fromAddress === toAddress) {
        setMessage({
          type: "error",
          text: "From and To addresses cannot be the same",
        });
        return;
      }

      const privateKey = getPrivateKey(fromAddress);
      if (!privateKey) {
        setMessage({
          type: "error",
          text: "Private key not found for selected wallet",
        });
        return;
      }

      // Check if wallet has sufficient balance
      const requestedAmount = parseFloat(amount);
      const requestedFee = parseFloat(fee) || 0;
      const totalRequired = requestedAmount + requestedFee;
      const availableBalance = calculateAvailableBalance(fromAddress);

      if (availableBalance < totalRequired) {
        const pendingSpent = mempool
          .filter(tx => tx.fromAddress === fromAddress)
          .reduce((total, tx) => total + tx.amount + tx.fee, 0);
        
        setMessage({
          type: "error",
          text: `Insufficient balance. Available: ${availableBalance.toFixed(2)} coins, Required: ${totalRequired.toFixed(2)} coins${pendingSpent > 0 ? ` (${pendingSpent.toFixed(2)} coins locked in pending transactions)` : ""}`,
        });
        return;
      }

      try {
        setIsSubmitting(true);
        setMessage(null);

        await createTransaction(
          fromAddress,
          toAddress,
          parseFloat(amount),
          parseFloat(fee) || 0,
          payload || undefined,
          privateKey,
        );

        // Immediately refresh all mempool displays
        triggerGlobalMempoolRefresh();

        setMessage({
          type: "success",
          text: "Transaction created successfully!",
        });
        setToAddress("");
        setAmount("");
        setFee("0");
        setPayload("");
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to create transaction",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const truncateAddress = (address: string, length: number = 12) => {
      return `${address.slice(0, length)}...${address.slice(-8)}`;
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Transaction
          </CardTitle>
          <CardDescription>
            Create a new transaction on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Address *
              </label>
              <select
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a wallet</option>
                {wallets.map((wallet, index) => (
                  <option key={wallet.publicKey} value={wallet.publicKey}>
                    Wallet #{index + 1} - {truncateAddress(wallet.publicKey)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Address *
              </label>
              <Input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Recipient's public key"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                    {fromAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxAmount = Math.max(0, calculateAvailableBalance(fromAddress) - (parseFloat(fee) || 0));
                          setAmount(maxAmount.toFixed(2));
                        }}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        Max
                      </button>
                    )}
                    <span className="text-gray-500 text-sm">coins</span>
                  </div>
                </div>
                {fromAddress && (
                  <div className="mt-1 text-xs">
                    {balanceLoading ? (
                      <span className="text-gray-500">Loading balance...</span>
                    ) : (
                      <span className={`${calculateAvailableBalance(fromAddress) < (parseFloat(amount) || 0) + (parseFloat(fee) || 0) ? 'text-red-600' : 'text-green-600'}`}>
                        Available: {calculateAvailableBalance(fromAddress).toFixed(2)} coins
                        {mempool.filter(tx => tx.fromAddress === fromAddress).length > 0 && (
                          <span className="text-orange-600 ml-1">
                            ({mempool.filter(tx => tx.fromAddress === fromAddress).reduce((total, tx) => total + tx.amount + tx.fee, 0).toFixed(2)} pending)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payload (Optional)
              </label>
              <Input
                type="text"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder="Additional data or message"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{message.text}</span>
                  {message.type === "success" && onSwitchToMempool && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSwitchToMempool}
                      className="ml-3 bg-white hover:bg-green-100 border-green-300 text-green-700 hover:text-green-800 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View in Mempool
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              {(() => {
                const hasInsufficientBalance = Boolean(fromAddress && amount && 
                  calculateAvailableBalance(fromAddress) < (parseFloat(amount) || 0) + (parseFloat(fee) || 0));
                
                return (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || hasInsufficientBalance}
                    className={hasInsufficientBalance ? "bg-gray-400 hover:bg-gray-400" : ""}
                  >
                    {isSubmitting ? "Creating..." : 
                     hasInsufficientBalance ? "Insufficient Balance" : "Send Transaction"
                    }
                  </Button>
                );
              })()}
            </div>
          </form>{" "}
        </CardContent>
      </Card>
    );
  } catch (err) {
    return (
      <ErrorFallback
        error={err instanceof Error ? err.message : "Error in transaction form"}
        suggestion="Try refreshing the page"
      />
    );
  }
}
