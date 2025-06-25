import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorFallback } from "@/components/ui/error-fallback";
import type { Block } from "@/types/blockchain";

interface BlockCardProps {
  block: Block;
  isLatest?: boolean;
}

export function BlockCard({ block, isLatest = false }: BlockCardProps) {
  try {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString();
    };

    const truncateHash = (
      hash: string | undefined | null,
      length: number = 10,
    ) => {
      if (!hash || typeof hash !== "string") return "N/A";
      return `${hash.slice(0, length)}...${hash.slice(-length)}`;
    };

    return (
      <Card className={isLatest ? "border-green-500 bg-green-50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Block #{block.hash ? block.hash.slice(0, 8) : "N/A"}
            </CardTitle>
            {isLatest && <Badge variant="default">Latest</Badge>}
          </div>
          <CardDescription>
            Mined on {formatDate(block.timestamp)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-600">Hash</p>
              <p className="font-mono text-xs break-all">
                {truncateHash(block.hash, 16)}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-600">Previous Hash</p>
              <p className="font-mono text-xs break-all">
                {truncateHash(block.previousHash, 16)}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-600">Nonce</p>
              <p className="font-mono">{block.nonce.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-600">Transactions</p>
              <p>{block.transactions.length}</p>
            </div>
          </div>
          {block.transactions.length > 0 && (
            <div>
              <p className="font-semibold text-gray-600 mb-2">Transactions</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {block.transactions.map((tx, index) => (
                  <div
                    key={tx.id || index}
                    className="bg-gray-50 p-2 rounded text-xs"
                  >
                    {" "}
                    <div className="flex justify-between items-center">
                      <span className="font-mono">
                        {tx.id ? tx.id.slice(0, 8) : "N/A"}...
                      </span>
                      <span className="font-semibold">{tx.amount} coins</span>
                    </div>{" "}
                    <div className="text-gray-500 mt-1 flex items-center gap-1">
                      {!tx.fromAddress && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1 py-0"
                        >
                          ⛏️ Mining
                        </Badge>
                      )}
                      <span>
                        {tx.fromAddress
                          ? `${tx.fromAddress.slice(0, 8)}...`
                          : "Coinbase"}{" "}
                        → {tx.toAddress ? tx.toAddress.slice(0, 8) : "N/A"}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}{" "}
        </CardContent>
      </Card>
    );
  } catch (err) {
    return (
      <ErrorFallback
        error={err instanceof Error ? err.message : "Error displaying block"}
        suggestion="This block may have invalid data"
      />
    );
  }
}
