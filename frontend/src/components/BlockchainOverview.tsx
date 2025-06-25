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
import { useBlockchain } from "@/hooks/useBlockchain";
import { blockchainAPI } from "@/services/api";
import { useState } from "react";
import { RefreshCw, Shield, AlertCircle, CheckCircle } from "lucide-react";

export function BlockchainOverview() {
  try {
    const { blockchain, loading, error, refetch } = useBlockchain();
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
      isValid: boolean;
      message?: string;
    } | null>(null);

    const handleValidate = async () => {
      try {
        setValidating(true);
        const result = await blockchainAPI.validateBlockchain();
        setValidationResult({
          isValid: result.valid,
          message: result.valid
            ? "Blockchain is valid"
            : "Blockchain validation failed",
        });
      } catch (error) {
        setValidationResult({
          isValid: false,
          message: error instanceof Error ? error.message : "Validation failed",
        });
      } finally {
        setValidating(false);
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString();
    };
    if (loading) {
      return <LoadingSpinner message="Loading blockchain data..." />;
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
    if (!blockchain || !blockchain.chain || !Array.isArray(blockchain.chain)) {
      return (
        <ErrorFallback
          error="Invalid blockchain data structure"
          onRetry={refetch}
          suggestion="The blockchain may not be properly initialized"
        />
      );
    }
    const latestBlock =
      blockchain.chain && blockchain.chain.length > 0
        ? blockchain.chain[blockchain.chain.length - 1]
        : null;
    const totalTransactions = blockchain.chain
      ? blockchain.chain.reduce(
          (sum, block) =>
            sum + (block.transactions ? block.transactions.length : 0),
          0,
        )
      : 0;

    return (
      <div className="space-y-6">
        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600">
                  Chain Length
                </span>
              </div>{" "}
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {blockchain.chain ? blockchain.chain.length : 0}
              </div>
              <div className="text-xs text-gray-500">blocks</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-600">
                  Difficulty
                </span>
              </div>{" "}
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {blockchain.difficulty || 0}
              </div>
              <div className="text-xs text-gray-500">leading zeros</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-600">
                  Pending
                </span>
              </div>{" "}
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {blockchain.pendingTransactions
                  ? blockchain.pendingTransactions.length
                  : 0}
              </div>
              <div className="text-xs text-gray-500">transactions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-600">
                  Total TXs
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {totalTransactions}
              </div>
              <div className="text-xs text-gray-500">processed</div>
            </CardContent>
          </Card>
        </div>
        {/* Latest Block Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Latest Block</CardTitle>
                <CardDescription>
                  Most recently mined block on the chain
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>{" "}
          <CardContent>
            {latestBlock ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Block Hash
                    </p>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                      {latestBlock.hash || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Previous Hash
                    </p>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                      {latestBlock.previousHash || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Timestamp
                    </span>
                    <span className="text-sm">
                      {latestBlock.timestamp
                        ? formatDate(latestBlock.timestamp)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Nonce
                    </span>
                    <span className="text-sm font-mono">
                      {latestBlock.nonce
                        ? latestBlock.nonce.toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Transactions
                    </span>
                    <Badge variant="outline">
                      {latestBlock.transactions
                        ? latestBlock.transactions.length
                        : 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Mining Reward
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {blockchain.miningReward || 0} coins
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No blocks found in the blockchain</p>
                <p className="text-sm">Mine the first block to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Blockchain Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Blockchain Validation
            </CardTitle>
            <CardDescription>
              Verify the integrity of the entire blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1">
                {validationResult && (
                  <div
                    className={`flex items-center gap-2 p-2 rounded-md ${
                      validationResult.isValid
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {validationResult.isValid ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span>
                      {validationResult.isValid
                        ? "Blockchain is valid and secure"
                        : `Validation failed: ${validationResult.message}`}
                    </span>
                  </div>
                )}
              </div>
              <Button onClick={handleValidate} disabled={validating}>
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Validate Chain
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (err) {
    return (
      <ErrorFallback
        error={
          err instanceof Error
            ? err.message
            : "An unexpected error occurred in blockchain overview"
        }
        onRetry={() => window.location.reload()}
        suggestion="Try refreshing the page or checking your network connection"
      />
    );
  }
}
