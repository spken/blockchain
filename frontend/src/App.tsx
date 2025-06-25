import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlockchainOverview } from "@/components/BlockchainOverview";
import { WalletManager } from "@/components/WalletManager";
import { TransactionForm } from "@/components/TransactionManager";
import { MiningInterface } from "@/components/MiningInterface";
import { MempoolViewer } from "@/components/MempoolViewer";
import { NetworkManager } from "@/components/NetworkManager";
import { BlockCard } from "@/components/BlockCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WalletProvider } from "@/contexts/WalletContext";
import {
  useBlocks,
  useMempool,
  useConsensus,
  useAutoNetworkSetup,
} from "@/hooks/useBlockchain";
import { useConnectionStatus } from "@/hooks/useConnection";
import {
  Blocks,
  Wallet,
  Send,
  Pickaxe,
  Clock,
  Home,
  Network,
  RefreshCw,
} from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    blocks,
    loading: blocksLoading,
    error: blocksError,
    refetch: refetchBlocks,
  } = useBlocks();
  const {
    mempool,
    loading: mempoolLoading,
    error: mempoolError,
    refetch: refetchMempool,
  } = useMempool();
  const { runConsensus } = useConsensus();
  const { isConnected, isChecking } = useConnectionStatus();
  const { runAutoNetworkSetup } = useAutoNetworkSetup();

  const [networkSetupMessage, setNetworkSetupMessage] = useState<string | null>(
    null,
  );

  // Auto network setup on application start
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        setNetworkSetupMessage("🔍 Discovering network nodes...");
        const result = await runAutoNetworkSetup();

        if (result) {
          if (result.singleNode) {
            setNetworkSetupMessage("ℹ️ Running in single-node mode");
          } else {
            setNetworkSetupMessage(
              `🌐 Connected to ${result.nodeCount} node network`,
            );
          }

          // Clear message after 5 seconds
          setTimeout(() => setNetworkSetupMessage(null), 5000);
        }
      } catch (error) {
        setNetworkSetupMessage("⚠️ Network setup failed - running offline");
        setTimeout(() => setNetworkSetupMessage(null), 5000);
      }
    };

    initializeNetwork();
  }, [runAutoNetworkSetup]);

  // Auto-refresh blocks when switching to blocks tab
  useEffect(() => {
    if (activeTab === "blocks") {
      refetchBlocks();
    }
  }, [activeTab, refetchBlocks]);

  // Periodic consensus to keep the blockchain synchronized
  useEffect(() => {
    const runPeriodicConsensus = async () => {
      try {
        const result = await runConsensus();
        if (result.note.includes("ersetzt")) {
          console.log("Blockchain synchronized via periodic consensus");
          // Refresh blocks if blockchain was updated
          refetchBlocks();
        }
      } catch (error) {
        console.log("Periodic consensus failed:", error);
      }
    };

    // Run consensus every 30 seconds to keep nodes synchronized
    const consensusInterval = setInterval(runPeriodicConsensus, 30000);

    // Also run consensus on initial load
    runPeriodicConsensus();

    return () => clearInterval(consensusInterval);
  }, [runConsensus, refetchBlocks]);

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Blocks className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Blockchain Explorer
                  </h1>
                  <p className="text-sm text-gray-500">
                    Decentralized blockchain network
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isChecking
                      ? "bg-yellow-500 animate-pulse"
                      : isConnected
                        ? "bg-green-500 animate-pulse"
                        : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm text-gray-600">
                  {isChecking
                    ? "Connecting..."
                    : isConnected
                      ? "Network Online"
                      : "Network Offline"}
                </span>
                {networkSetupMessage && (
                  <div className="ml-4 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                    {networkSetupMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 mb-8">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="blocks" className="flex items-center gap-2">
                <Blocks className="w-4 h-4" />
                <span className="hidden sm:inline">Blocks</span>
              </TabsTrigger>
              <TabsTrigger value="wallets" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Wallets</span>
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="mining" className="flex items-center gap-2">
                <Pickaxe className="w-4 h-4" />
                <span className="hidden sm:inline">Mining</span>
              </TabsTrigger>
              <TabsTrigger
                value="mempool"
                className="flex items-center gap-2 relative"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Mempool</span>
                {mempool.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 animate-pulse"
                  >
                    {mempool.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Network</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <ErrorBoundary>
                <BlockchainOverview />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="blocks" className="space-y-6">
              <ErrorBoundary>
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Blockchain Blocks
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refetchBlocks}
                      disabled={blocksLoading}
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${blocksLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </div>
                  {blocksLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading blocks...</p>
                    </div>
                  ) : blocksError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-5 h-5 text-red-600">⚠</div>
                        <h3 className="font-semibold text-red-800">
                          Failed to load blocks
                        </h3>
                      </div>
                      <p className="text-red-700 mb-2">{blocksError}</p>
                      <p className="text-red-600 text-sm mb-4">
                        Make sure the blockchain backend is running on{" "}
                        {import.meta.env.VITE_API_BASE_URL ||
                          "http://localhost:3001"}
                      </p>
                      <button
                        onClick={refetchBlocks}
                        className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : blocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No blocks found
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {[...blocks].reverse().map((block, index) => (
                        <BlockCard
                          key={block.hash}
                          block={block}
                          isLatest={index === 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="wallets" className="space-y-6">
              <ErrorBoundary>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Wallet Management
                  </h2>
                  <WalletManager />
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <ErrorBoundary>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Transaction Management
                  </h2>
                  <TransactionForm
                    onSwitchToMempool={() => setActiveTab("mempool")}
                  />
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="mining" className="space-y-6">
              <ErrorBoundary>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Mining Interface
                  </h2>
                  <MiningInterface />
                </div>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="mempool" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Memory Pool
                </h2>
                <ErrorBoundary>
                  {mempoolLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading mempool...</p>
                    </div>
                  ) : mempoolError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-5 h-5 text-red-600">⚠</div>
                        <h3 className="font-semibold text-red-800">
                          Failed to load mempool
                        </h3>
                      </div>
                      <p className="text-red-700 mb-2">{mempoolError}</p>
                      <p className="text-red-600 text-sm mb-4">
                        Make sure the blockchain backend is running on{" "}
                        {import.meta.env.VITE_API_BASE_URL ||
                          "http://localhost:3001"}
                      </p>
                      <button
                        onClick={refetchMempool}
                        className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <MempoolViewer />
                  )}
                </ErrorBoundary>
              </div>
            </TabsContent>

            <TabsContent value="network" className="space-y-6">
              <ErrorBoundary>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Network Management
                  </h2>
                  <NetworkManager />
                </div>
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-500 text-sm">
              <p>
                © 2024 Blockchain Explorer. Built with React, Vite, and
                Tailwind CSS.
              </p>
              <p className="mt-2">
                Connected to blockchain network on{" "}
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"}
                </code>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </WalletProvider>
  );
}

export default App;
