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
import { useTransactions, useWallets } from "@/hooks/useBlockchain";
import { useWalletContext } from "@/contexts/WalletContext";
import { Send, DollarSign } from "lucide-react";

export function TransactionForm() {
  try {
    const { wallets } = useWallets();
    const { createTransaction } = useTransactions();
    const { getPrivateKey } = useWalletContext();

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
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-gray-500 text-sm">coins</span>
                  </div>
                </div>
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
                {message.text}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Send Transaction"}
              </Button>
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
