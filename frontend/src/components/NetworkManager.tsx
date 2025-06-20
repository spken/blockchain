import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ErrorFallback, LoadingSpinner } from "@/components/ui/error-fallback"
import { useNetwork } from "@/hooks/useBlockchain"
import { blockchainAPI } from "@/services/api"
import { Network, Server, Plus, RefreshCw, Wifi, WifiOff, Clock } from "lucide-react"

export function NetworkManager() {
  try {
    const { networkInfo, nodeStatuses, loading, error, refetch, registerNode, initializeNetwork } = useNetwork()
    const [newNodeUrl, setNewNodeUrl] = useState("")
    const [isAddingNode, setIsAddingNode] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [scanResults, setScanResults] = useState<{
      timestamp: string;
      totalScanned: number;
      onlineCount: number;
      offlineCount: number;
      nodes: Array<{
        url: string;
        port: number;
        status: 'online' | 'offline';
        error?: string;
        chainLength?: number;
        networkNodes?: number;
      }>;
      readyForNetwork: boolean;
    } | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    if (loading) {
      return <LoadingSpinner message="Loading network information..." />
    }

    if (error) {
      return (
        <ErrorFallback 
          error={error}
          onRetry={refetch}
          suggestion={`Make sure the blockchain backend is running on ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}`}
        />
      )
    }

    if (!networkInfo) {
      return (
        <ErrorFallback 
          error="No network information available"
          onRetry={refetch}
          suggestion="The network may not be initialized yet"
        />
      )
    }    const handleAddNode = async (e: React.FormEvent) => {
      e.preventDefault()
      
      if (!newNodeUrl.trim()) {
        setMessage({ type: 'error', text: 'Please enter a valid node URL' })
        return
      }

      if (!newNodeUrl.startsWith('http://') && !newNodeUrl.startsWith('https://')) {
        setMessage({ type: 'error', text: 'Node URL must start with http:// or https://' })
        return
      }

      try {
        setIsAddingNode(true)
        setMessage(null)
        
        await registerNode(newNodeUrl)
        setMessage({ type: 'success', text: 'Node added successfully!' })
        setNewNodeUrl("")
      } catch (err) {
        setMessage({ 
          type: 'error', 
          text: err instanceof Error ? err.message : 'Failed to add node' 
        })
      } finally {        setIsAddingNode(false)
      }
    }

    const handleInitializeNetwork = async () => {
      try {
        setIsInitializing(true)
        setMessage(null)
        
        const defaultNodes = [
          "http://localhost:3001",
          "http://localhost:3002", 
          "http://localhost:3003",
          "http://localhost:3004"
        ]
        
        await initializeNetwork(defaultNodes)
        setMessage({ type: 'success', text: 'Network initialized successfully!' })
      } catch (err) {
        setMessage({ 
          type: 'error', 
          text: err instanceof Error ? err.message : 'Failed to initialize network' 
        })
      } finally {        setIsInitializing(false)
      }
    }

    const handleScanNodes = async () => {
      try {
        setIsScanning(true)
        setMessage(null)
        
        const results = await blockchainAPI.scanNodes()
        setScanResults(results)
        setMessage({ 
          type: 'success', 
          text: `Scan completed: ${results.onlineCount} nodes online, ${results.offlineCount} offline` 
        })
      } catch (err) {
        console.error('Scan error:', err)
        setMessage({ 
          type: 'error', 
          text: err instanceof Error ? err.message : 'Failed to scan nodes. Make sure the backend is running.' 
        })
      } finally {
        setIsScanning(false)
      }
    }

    const getStatusIcon = (status: 'online' | 'offline' | 'checking') => {
      switch (status) {
        case 'online':
          return <Wifi className="w-4 h-4 text-green-600" />
        case 'offline':
          return <WifiOff className="w-4 h-4 text-red-600" />
        case 'checking':
          return <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />
        default:
          return <Clock className="w-4 h-4 text-gray-400" />
      }
    }

    const getStatusBadge = (status: 'online' | 'offline' | 'checking') => {
      switch (status) {
        case 'online':
          return <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>
        case 'offline':
          return <Badge className="bg-red-100 text-red-800 border-red-200">Offline</Badge>
        case 'checking':
          return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Checking...</Badge>
        default:
          return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>
      }
    }

    const allNodes = [networkInfo.currentNodeUrl, ...networkInfo.networkNodes]
    const onlineNodes = Object.values(nodeStatuses).filter(status => status === 'online').length
    const offlineNodes = Object.values(nodeStatuses).filter(status => status === 'offline').length

    return (
      <div className="space-y-6">        {/* Network Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Total Nodes</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {allNodes.length}
              </div>
              <div className="text-xs text-blue-600">in network</div>
              {allNodes.length === 1 && (
                <Button 
                  onClick={handleInitializeNetwork} 
                  disabled={isInitializing}
                  size="sm" 
                  className="mt-2 w-full"
                >
                  {isInitializing ? 'Initializing...' : 'Quick Setup'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {onlineNodes}
              </div>
              <div className="text-xs text-green-600">nodes active</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-600">Offline</span>
              </div>
              <div className="text-2xl font-bold text-red-900 mt-1">
                {offlineNodes}
              </div>
              <div className="text-xs text-red-600">nodes down</div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Node */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Node
            </CardTitle>
            <CardDescription>
              Register a new node to the blockchain network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddNode} className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="http://localhost:3002"
                  value={newNodeUrl}
                  onChange={(e) => setNewNodeUrl(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isAddingNode}>
                  {isAddingNode ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Node
                    </>
                  )}
                </Button>
              </div>
              
              {message && (
                <div className={`p-3 rounded ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}
            </form>
          </CardContent>
        </Card>        {/* Scan Results */}
        {scanResults && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="w-4 h-4" />
                Port Scan
              </CardTitle>
              <CardDescription className="text-xs">
                {new Date(scanResults.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {scanResults.nodes.map((node) => (
                  <div key={node.port} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      {node.status === 'online' ? (
                        <Wifi className="w-3 h-3 text-green-600" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-red-600" />
                      )}
                      <span className="font-mono">:{node.port}</span>
                      {node.chainLength !== undefined && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {node.chainLength} blocks
                        </Badge>
                      )}
                    </div>
                    <Badge className={node.status === 'online' 
                      ? "bg-green-100 text-green-800 border-green-200 text-xs" 
                      : "bg-red-100 text-red-800 border-red-200 text-xs"
                    }>
                      {node.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <span>{scanResults.onlineCount} online • {scanResults.offlineCount} offline</span>
                {scanResults.readyForNetwork && (
                  <span className="text-green-600 flex items-center gap-1">
                    ✓ Ready
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Network Nodes List */}
        <Card>
          <CardHeader>              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Network Nodes
                  </CardTitle>
                  <CardDescription>
                    All nodes participating in the blockchain network
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleScanNodes} disabled={isScanning} variant="outline" size="sm">
                    {isScanning ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Network className="w-4 h-4 mr-2" />
                        Scan Ports
                      </>
                    )}
                  </Button>
                  <Button onClick={refetch} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allNodes.map((nodeUrl, index) => {
                const isCurrentNode = nodeUrl === networkInfo.currentNodeUrl
                const status = nodeStatuses[nodeUrl] || 'checking'
                
                return (
                  <div key={nodeUrl} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{nodeUrl}</span>
                          {isCurrentNode && (
                            <Badge variant="outline" className="text-xs">
                              Current Node
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Node {index + 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status)}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {allNodes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Network className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>No network nodes found</p>
                <p className="text-sm">Add nodes to expand the network</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch (err) {
    return (
      <ErrorFallback 
        error={err instanceof Error ? err.message : 'An unexpected error occurred in network manager'}
        onRetry={() => window.location.reload()}
        suggestion="Try refreshing the page or checking your network connection"
      />
    )
  }
}
