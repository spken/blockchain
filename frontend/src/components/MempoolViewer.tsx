import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorFallback, LoadingSpinner } from "@/components/ui/error-fallback";
import { useMempoolSorted } from "@/hooks/useBlockchain";
import { Clock, DollarSign } from "lucide-react";
import { useState } from "react";

export function MempoolViewer() {
  try {
    const [sortBy, setSortBy] = useState<"default" | "fee" | "age">("default");
    const { mempool, loading, error, refetch } = useMempoolSorted(sortBy);

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString();
    };

    const truncateAddress = (address: string | null, length: number = 12) => {
      if (!address) return "Coinbase";
      return `${address.slice(0, length)}...${address.slice(-8)}`;
    };

    // Calculate fees from Transaction[] structure
    const totalFees = Array.isArray(mempool)
      ? mempool.reduce((sum, transaction) => {
          const fee =
            typeof transaction?.fee === "number" ? transaction.fee : 0;
          return sum + fee;
        }, 0)
      : 0;
    const averageFee = mempool.length > 0 ? totalFees / mempool.length : 0;

    if (loading) {
      return <LoadingSpinner message="Loading mempool..." />;
    }

    if (error) {
      return (
        <ErrorFallback
          error={error}
          onRetry={refetch}
          suggestion={`Make sure the blockchain backend is running on ${import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"}`}
        />
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Mempool Viewer
              </CardTitle>
              <CardDescription>
                Transactions waiting to be included in the next block
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "default" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("default")}
              >
                Default
              </Button>
              <Button
                variant={sortBy === "fee" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("fee")}
              >
                <DollarSign className="w-4 h-4 mr-1" />
                By Fee
              </Button>
              <Button
                variant={sortBy === "age" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("age")}
              >
                <Clock className="w-4 h-4 mr-1" />
                By Age
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mempool Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  Pending
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {mempool.length}
              </div>
              <div className="text-xs text-blue-600">transactions</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Total Fees
                </span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {totalFees.toFixed(2)}
              </div>
              <div className="text-xs text-green-600">coins</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">
                  Avg Fee
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {averageFee.toFixed(2)}
              </div>
              <div className="text-xs text-purple-600">coins</div>
            </div>
          </div>

          {/* Transaction List */}
          {mempool.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>Mempool is empty</p>
              <p className="text-sm">No transactions waiting to be mined</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 mb-3">
                Pending Transactions
              </h4>
              {mempool.map((transaction, index) => {
                const transactionId = transaction.id || `tx-${index}`;
                return (
                  <div
                    key={transactionId}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {transaction.id
                            ? `${transaction.id.slice(0, 8)}...`
                            : `Transaction ${index + 1}`}
                        </Badge>
                        <Badge variant="secondary">
                          Fee: {transaction.fee} coins
                        </Badge>
                      </div>
                      <span className="font-semibold text-green-600">
                        {transaction.amount} coins
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-600">From</p>
                        <p className="font-mono">
                          {truncateAddress(transaction.fromAddress)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">To</p>
                        <p className="font-mono">
                          {truncateAddress(transaction.toAddress)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Timestamp</p>
                        <p>{formatDate(transaction.timestamp)}</p>
                      </div>
                    </div>

                    {transaction.payload && (
                      <div className="mt-2">
                        <p className="font-medium text-gray-600 text-sm">
                          Payload
                        </p>
                        <p className="text-xs bg-gray-100 p-2 rounded font-mono">
                          {JSON.stringify(transaction.payload)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  } catch (err) {
    return (
      <ErrorFallback
        error={
          err instanceof Error
            ? err.message
            : "An unexpected error occurred in mempool viewer"
        }
        onRetry={() => window.location.reload()}
        suggestion="Try refreshing the page or checking your network connection"
      />
    );
  }
}
