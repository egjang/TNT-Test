import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { X, ZoomIn, ZoomOut, RefreshCw, Activity, DollarSign, TrendingUp, Users } from 'lucide-react'
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d'
import * as d3 from 'd3-force'

type Customer = {
  customerId: string
  customerName: string
  customerSeq?: number
  empSeq?: number
  empId?: string
  empName?: string
}

type GraphNode = {
  id: string
  label: string
  type: 'customer' | 'employee' | 'sales_activity' | 'revenue'
  properties?: Record<string, any>
  val?: number
  color?: string
  x?: number
  y?: number
}

type GraphEdge = {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  label: string
  properties?: Record<string, any>
}

type InsightsData = {
  recentActivities?: number
  totalActivities?: number
  totalRevenue?: number
  totalRevenueAll?: number
  transactionCount?: number
  totalTransactions?: number
  productVariety?: number
}

type GraphData = {
  nodes: GraphNode[]
  links: GraphEdge[]
  insights?: InsightsData
  _sample?: boolean
}

type ViewMode = 'customer' | 'all-customers' | 'all-employees'

type Props = {
  customer: Customer
  onClose: () => void
  initialMode?: ViewMode
}

const NODE_LABELS: Record<string, string> = {
  customer: '거래처',
  employee: '담당자',
  sales_activity: '영업활동',
  revenue: '매출'
}

const NODE_COLORS: Record<string, string> = {
  customer: '#3b82f6',
  employee: '#ef4444',
  sales_activity: '#10b981',
  revenue: '#f59e0b',
  customer_inactive: '#94a3b8' // Changed from inactive_group to customer_inactive
}

export function CustomerGraphPopup({ customer, onClose, initialMode = 'customer' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraphMethods>(null)

  const [viewMode, setViewMode] = useState<ViewMode>(initialMode)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [insights, setInsights] = useState<InsightsData | null>(null)

  // For 'all-employees' mode
  const [expandedEmployees, setExpandedEmployees] = useState<string[]>([])
  const [employeeGraphs, setEmployeeGraphs] = useState<Record<string, GraphData>>({})
  const [baseEmployeeNodes, setBaseEmployeeNodes] = useState<GraphNode[]>([])

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }

    window.addEventListener('resize', updateDimensions)
    // Initial update
    setTimeout(updateDimensions, 100)

    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const loggedEmpId = typeof window !== 'undefined'
    ? (localStorage.getItem('tnt.sales.empId') || customer.empId || null)
    : (customer.empId || null)

  const fetchGraphData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLoading(true)
      setError(null)

      let url = ''
      if (viewMode === 'customer') {
        const params = new URLSearchParams()
        if (customer.customerSeq != null) {
          params.set('customerSeq', String(customer.customerSeq))
        }
        const queryString = params.toString()
        url = `/api/v1/graph/customer/${customer.customerId}${queryString ? `?${queryString}` : ''}`
      } else if (viewMode === 'all-customers') {
        // Use logged-in employee ID, fallback to customer's assignee, then default
        const empId = loggedEmpId || (customer as any).assigneeId || '1001'
        url = `/api/v1/graph/employee/${empId}/customers`
      } else if (viewMode === 'all-employees') {
        url = `/api/v1/graph/employees`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      if (viewMode === 'all-employees') {
        const nodes = data.nodes.map((n: any) => ({
          ...n,
          ...n,
          val: 30, // Increased from 20 to 30 (1.5x)
          color: NODE_COLORS.employee
        }))
        setBaseEmployeeNodes(nodes)
        setGraphData({ nodes, links: [] })
        setExpandedEmployees([])
        setEmployeeGraphs({})
        setExpandedEmployees([])
        setEmployeeGraphs({})
        setInsights(data.insights || null)
      } else {
        const processedNodes = data.nodes.map((n: any) => ({
          ...n,
          // Reduced sizes: Customer 10->7, Employee 15->10, Inactive/Others 5->3
          val: n.type === 'customer' ? 7 : (n.type === 'employee' ? 10 : (n.type === 'customer_inactive' ? 3 : 3)),
          color: NODE_COLORS[n.type] || '#999'
        }))
        setGraphData({
          nodes: processedNodes,
          links: data.edges
        })
        setInsights(data.insights)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [customer.customerId, viewMode])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  // Fetch Subgraph for an Employee
  const fetchEmployeeSubgraph = async (empId: string) => {
    try {
      // empId format: "employee_123" -> extract "123"
      const id = empId.split('_')[1]
      const url = `/api/v1/graph/employee/${id}/customers`
      const response = await fetch(url)
      const data = await response.json()

      if (!data.error) {
        const nodes = data.nodes.map((n: any) => ({
          ...n,
          val: n.type === 'customer' ? 7 : (n.type === 'employee' ? 10 : (n.type === 'customer_inactive' ? 3 : 3)),
          color: NODE_COLORS[n.type] || '#999'
        }))
        return { nodes, links: data.edges, insights: data.insights }
      }
    } catch (e) {
      console.error(e)
    }
    return null
  }

  const updateGraphData = (activeEmpIds: string[], graphs: Record<string, GraphData>) => {
    // Merge base nodes + subgraphs of active employees
    const allNodesMap = new Map<string, GraphNode>()
    const allLinksMap = new Map<string, any>()

    // Add base employee nodes
    baseEmployeeNodes.forEach(node => allNodesMap.set(node.id, node))

    // Add active subgraphs
    activeEmpIds.forEach(empId => {
      const g = graphs[empId]
      if (g) {
        g.nodes.forEach((n: any) => allNodesMap.set(n.id, n))
        g.links.forEach((l: any) => allLinksMap.set(l.id, l))
      }
    })

    setGraphData({
      nodes: Array.from(allNodesMap.values()),
      links: Array.from(allLinksMap.values())
    })
  }


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleNodeClick = async (node: GraphNode) => {
    // 'All Employees' Mode Logic
    if (viewMode === 'all-employees' && node.type === 'employee') {
      setSelectedNode(node)

      if (expandedEmployees.includes(node.id)) {
        // Already expanded, maybe just focus?
        if (fgRef.current) {
          fgRef.current.centerAt(node.x, node.y, 1000)
          fgRef.current.zoom(1.5, 1000)
        }
        return
      }

      // Expand Logic
      // 1. Update queue (Recent 5)
      let newExpanded = [...expandedEmployees, node.id]
      if (newExpanded.length > 5) { // Increased limit to 5
        newExpanded.shift() // Remove oldest
      }
      setExpandedEmployees(newExpanded)

      // 2. Fetch data if not cached
      if (!employeeGraphs[node.id]) {
        const result = await fetchEmployeeSubgraph(node.id)
        if (result) {
          setEmployeeGraphs(prev => ({ ...prev, [node.id]: result }))
          updateGraphData(newExpanded, { ...employeeGraphs, [node.id]: result })
          // Set insights to the expanded employee's stats
          if (result.insights) setInsights(result.insights)
        }
      } else {
        updateGraphData(newExpanded, employeeGraphs)
        // Set insights from cache
        const cached = employeeGraphs[node.id]
        // @ts-ignore
        if (cached && cached.insights) setInsights(cached.insights)
      }
    } else {
      // Standard behavior
      setSelectedNode(node)
      if (fgRef.current && node.x && node.y) {
        fgRef.current.centerAt(node.x, node.y, 1000)
        fgRef.current.zoom(2.5, 1000)
      }
    }
  }

  const handleNodeHover = (node: GraphNode | null) => {
    setHoverNode(node)
    const newHighlightNodes = new Set<string>()
    const newHighlightLinks = new Set<string>()

    if (node) {
      newHighlightNodes.add(node.id)
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source
        const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target

        if (sourceId === node.id || targetId === node.id) {
          newHighlightLinks.add(link.id)
          newHighlightNodes.add(sourceId)
          newHighlightNodes.add(targetId)
        }
      })
    }

    // Reset highlights if null
    if (!node) {
      setHighlightNodes(new Set())
      setHighlightLinks(new Set())
      return
    }

    // Find neighbors
    const neighbors = new Set<string>()
    const links = new Set<string>()

    // Check Links
    graphData.links.forEach((link: any) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target

      if (sourceId === node.id || targetId === node.id) {
        links.add(link.id)
        neighbors.add(sourceId)
        neighbors.add(targetId)
      }
    })

    setHighlightNodes(neighbors)
    setHighlightLinks(links)
  }

  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400)
  }

  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 0.8, 400)
  }

  const handleRefresh = () => {
    fetchGraphData()
    if (fgRef.current) fgRef.current.zoomToFit(400)
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`
    return amount.toLocaleString()
  }

  // D3 Forces configuration
  const configureForces = useCallback(() => {
    if (fgRef.current) {
      const isAllCustomers = viewMode === 'all-customers'
      const isAllEmployees = viewMode === 'all-employees'

      // 1. Calculate Node Degrees (Centrality)
      const graph = fgRef.current.graphData()
      const degrees: Record<string, number> = {}
      graph.links.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        degrees[sourceId] = (degrees[sourceId] || 0) + 1
        degrees[targetId] = (degrees[targetId] || 0) + 1
      })

      // Collision force
      // @ts-ignore
      fgRef.current.d3Force('collide', (d3.forceCollide() as any).radius((node: any) => {
        const radius = node.type === 'customer' ? 15 : (node.type === 'customer_inactive' ? 5 : 10)
        // Tighter buffer for all-employees
        const buffer = isAllEmployees ? 1.2 : (isAllCustomers ? 1.5 : 3.0)
        return radius * buffer
      }))

      // Dynamic Charge force
      // @ts-ignore
      fgRef.current.d3Force('charge').strength((node: any) => {
        if (node.type === 'customer_inactive') return -10 // Weak repulsion for inactive -> Cluster together

        if (isAllEmployees) {
          // Stronger repulsion for high-degree nodes (Employees with many customers)
          const degree = degrees[node.id] || 0
          const baseCharge = -30
          // E.g., 10 customers -> -30 - (10 * 3) = -60
          return baseCharge - (degree * 3)
        }
        return isAllCustomers ? -100 : -300
      })

      // Dynamic Link force
      // @ts-ignore
      fgRef.current.d3Force('link').distance((link: any) => {
        const target = typeof link.target === 'object' ? link.target : { type: '' } // Safe guard
        if (target.type === 'customer_inactive') return 250 // Push far away

        if (isAllEmployees) {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source
          const targetId = typeof link.target === 'object' ? link.target.id : link.target

          const sourceDegree = degrees[sourceId] || 0
          const targetDegree = degrees[targetId] || 0
          const maxDegree = Math.max(sourceDegree, targetDegree)

          // Base 20. Add distance for busy nodes.
          // If an employee has 20 customers, distance grows to 20 + 20 = 40.
          return 20 + Math.min(maxDegree, 50)
        }
        return (isAllCustomers) ? 40 : 60
      })

      // Radial Force (Centering) - Fixes outlier issue
      // Only apply in All-Employees mode to keep things contained
      if (isAllEmployees) {
        // @ts-ignore
        fgRef.current.d3Force('radial', d3.forceRadial(0, 0, 0).strength(0.08))
      } else {
        // @ts-ignore
        fgRef.current.d3Force('radial', null)
      }
    }
  }, [viewMode])

  // Re-run force config when graph data or view mode changes
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      setTimeout(configureForces, 100)
    }
  }, [graphData, configureForces])

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label
    const nodeValue = node.val || 5
    const radius = nodeValue * (node.type === 'customer' ? 1.5 : 1)

    // Highlight Logic
    const isHighlighted = highlightNodes.has(node.id)
    const hasHighlight = highlightNodes.size > 0
    const isPrimary = node.id === hoverNode?.id

    // Opacity
    const isVisible = !hasHighlight || isHighlighted

    // Visibility Logic (Level of Detail)
    let showLabel = false

    if (viewMode === 'all-employees') {
      showLabel = true // Always show labels for employees in this mode (initially at least)
      if (node.type !== 'employee') {
        // For sub-nodes of employees
        showLabel = isHighlighted || isPrimary || globalScale >= 1.5
      }
    } else if (viewMode === 'all-customers') {
      // 내 전체 거래처 모드
      // 1. Hover/Highlight 상태면 무조건 표시
      if (isHighlighted || isPrimary) {
        showLabel = true
      }
      // 2. 아니면 줌 레벨에 따라 표시
      else {
        if (node.type === 'employee') {
          showLabel = true // 담당자는 항상 표시 (중심점)
        } else if (node.type === 'customer') {
          // 거래처: 1.5 -> 1.2로 복구 (더 빨리 보이게)
          showLabel = globalScale >= 1.2
        } else {
          // 세부 활동: 3.0 -> 2.5로 복구
          showLabel = globalScale >= 2.5
        }
      }
    } else {
      // 개별 거래처 모드 (Optimized)
      // 1. Hover/Highlight 상태면 무조건 표시
      if (isHighlighted || isPrimary) {
        showLabel = true
      } else {
        // 2. 중요 노드(거래처, 담당자)는 항상 표시하거나 낮은 줌에서도 표시
        if (node.type === 'customer' || node.type === 'employee') {
          showLabel = true
        } else {
          // 3. 활동/매출 등 상세 노드는 줌인 해야 표시 (1.2 -> 1.0 약간 완화)
          // 4. Inactive Group도 항상 표시 (Type changed check)
          if (node.type === 'customer_inactive') {
            showLabel = globalScale >= 1.5 // Zoom in deeply to see inactive labels
          } else {
            showLabel = globalScale >= 1.0
          }
        }
      }
    }

    ctx.globalAlpha = isVisible ? 1 : 0.2

    // Draw Node Circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = node.color || '#999'
    ctx.fill()

    // Highlight Ring
    if (isPrimary || (isHighlighted && hasHighlight)) {
      ctx.lineWidth = 2 / globalScale
      ctx.strokeStyle = '#333'
      ctx.stroke()
    }

    // Draw Label
    // 투명해진 노드는 라벨도 그리지 않음 (선택 집중)
    if (showLabel && isVisible) {
      // Dynamic Font Size Adjustment (Small font)
      // Reduced base font size from 8 to 6
      const baseFontSize = 6

      const fontSize = Math.min(baseFontSize / Math.pow(globalScale, 0.6) * 1.3, baseFontSize * 2.5)

      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1e293b'

      const lines = label.split('\n')
      lines.forEach((line: string, i: number) => {
        const yOffset = radius + fontSize * 0.6 + (i * fontSize * 1.1) + 2
        ctx.fillText(line, node.x, node.y + yOffset)
      })
    }

    ctx.globalAlpha = 1
  }, [highlightNodes, hoverNode, graphData.nodes.length, viewMode])

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const isHovered = highlightLinks.has(link.id) || highlightLinks.size === 0

    ctx.globalAlpha = isHovered ? 1 : 0.1
    ctx.beginPath()
    ctx.moveTo(link.source.x, link.source.y)
    ctx.lineTo(link.target.x, link.target.y)
    ctx.lineWidth = 1
    ctx.strokeStyle = '#cbd5e1'

    if (highlightLinks.has(link.id)) {
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
    }

    ctx.stroke()
    ctx.globalAlpha = 1
  }, [highlightLinks])

  const renderInsights = () => {
    // Use the state variable 'insights', not graphData.insights
    if (!insights) return null

    // Determine what to show based on available keys
    const showEmployeeStats = 'totalEmployees' in insights
    const showCustomerStats = 'totalCustomers' in insights

    return (
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
        {/* Insight Cards */}

        {/* Card 1: Activities (or Total Employees in All-Employees mode) */}
        {!showEmployeeStats && (
          <div style={{
            backgroundColor: 'white', padding: 16, borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ padding: 8, backgroundColor: '#eff6ff', borderRadius: 8 }}>
              <Activity size={24} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Recent Activities</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{insights.recentActivities || 0}건</p>
            </div>
          </div>
        )}

        {/* Card 1-Alt: Total Employees (Only in All-Employees mode) */}
        {showEmployeeStats && (
          <div style={{
            backgroundColor: 'white', padding: 16, borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ padding: 8, backgroundColor: '#eff6ff', borderRadius: 8 }}>
              <Users size={24} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Employees</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{insights.totalEmployees}명</p>
            </div>
          </div>
        )}

        {/* Card 2: Revenue (Always show unless All-Employees mode where it's not relevant initially) */}
        {!showEmployeeStats && (
          <div style={{
            backgroundColor: 'white', padding: 16, borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ padding: 8, backgroundColor: '#ecfdf5', borderRadius: 8 }}>
              <DollarSign size={24} color="#059669" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue (90일)</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{formatCurrency(insights.totalRevenue || 0)}원</p>
            </div>
          </div>
        )}

        {/* Card 3: Total Customers (Show if available) */}
        {showCustomerStats && (
          <div style={{
            backgroundColor: 'white', padding: 16, borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ padding: 8, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
              <Users size={24} color="#15803d" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Customers</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{insights.totalCustomers}개사</p>
            </div>
          </div>
        )}

        {graphData._sample && (
          <div style={{
            padding: '8px 12px',
            background: '#fef3c7',
            borderRadius: 8,
            fontSize: 11,
            color: '#92400e',
            width: 'fit-content'
          }}>
            샘플 데이터입니다
          </div>
        )}
      </div>
    )
  }


  const renderNodeDetails = () => {
    if (!selectedNode) return null

    // Filter out internal/system properties
    const properties = selectedNode.properties || {}
    const visibleProps = Object.entries(properties).filter(([key]) =>
      !['elementId', 'id', 'x', 'y', 'vx', 'vy', 'index', 'color', 'val'].includes(key)
    )

    let title = selectedNode.label.split('\n')[0]
    let subtitle = NODE_LABELS[selectedNode.type] || selectedNode.type
    let icon = <Users size={20} color={NODE_COLORS[selectedNode.type]} />

    if (selectedNode.type === 'sales_activity') {
      icon = <Activity size={20} color={NODE_COLORS.sales_activity} />
    } else if (selectedNode.type === 'revenue') {
      icon = <DollarSign size={20} color={NODE_COLORS.revenue} />
    }

    return (
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 320,
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        zIndex: 20,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        maxHeight: 'calc(100% - 32px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'start',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              padding: 8,
              backgroundColor: 'white',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              height: 'fit-content'
            }}>
              {icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{title}</h3>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{subtitle}</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          {visibleProps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visibleProps.map(([key, value]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 14, color: '#334155' }}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              상세 정보가 없습니다
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '95%',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>
              {customer.customerName} <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}>관계도 분석</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
              <button
                onClick={() => setViewMode('customer')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  backgroundColor: viewMode === 'customer' ? 'white' : 'transparent',
                  color: viewMode === 'customer' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'customer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                현재 거래처
              </button>
              <button
                onClick={() => setViewMode('all-customers')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  backgroundColor: viewMode === 'all-customers' ? 'white' : 'transparent',
                  color: viewMode === 'all-customers' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'all-customers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                내 전체 거래처
              </button>
              <button
                onClick={() => setViewMode('all-employees')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  backgroundColor: viewMode === 'all-employees' ? 'white' : 'transparent',
                  color: viewMode === 'all-employees' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'all-employees' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                전체 영업사원
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 8,
                borderRadius: '50%',
                border: 'none',
                background: '#f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Graph Container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            cursor: 'grab'
          }}
        >
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.8)'
            }}>
              <div className="animate-spin" style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid #e2e8f0', borderTopColor: '#3b82f6'
              }} />
            </div>
          )}

          {error && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, color: '#ef4444'
            }}>
              <div>{error}</div>
              <button
                onClick={fetchGraphData}
                style={{
                  padding: '8px 16px', borderRadius: 6,
                  backgroundColor: 'white', border: '1px solid #e2e8f0',
                  fontSize: 13, fontWeight: 500
                }}
              >
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {renderInsights()}
              {renderNodeDetails()}

              <div style={{ position: 'absolute', right: 16, bottom: 24, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ControlButton onClick={handleZoomIn} icon={<ZoomIn size={18} />} title="확대" />
                <ControlButton onClick={handleZoomOut} icon={<ZoomOut size={18} />} title="축소" />
                <ControlButton onClick={handleRefresh} icon={<RefreshCw size={18} />} title="새로고침" />
              </div>

              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="label"
                nodeColor="color"
                nodeRelSize={6}

                // Custom Rendering
                nodeCanvasObject={nodeCanvasObject}
                linkCanvasObject={linkCanvasObject}

                // Interaction
                onNodeClick={(node) => {
                  handleNodeClick(node);
                  setSelectedNode(node);
                }}
                onNodeHover={handleNodeHover}
                onNodeDragEnd={(node) => {
                  // Pin node on drag end
                  node.fx = node.x;
                  node.fy = node.y;
                }}

                // Forces
                d3VelocityDecay={0.1}
                cooldownTicks={100}
                onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
              />
            </>
          )}
        </div>

        {/* Footer / Legend */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 24,
          fontSize: 12,
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS.customer }} />
            거래처
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS.employee }} />
            담당자
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS.sales_activity }} />
            영업활동
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS.revenue }} />
            매출
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS.customer_inactive }} />
            활동/매출 없음
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} />
            {graphData.nodes.length} Nodes
          </div>
        </div>
      </div>
    </div>
  )
}

// Subcomponents for cleaner code
const ControlButton = ({ onClick, icon, title }: { onClick: () => void, icon: React.ReactNode, title: string }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 36, height: 36, borderRadius: '50%',
      backgroundColor: 'white', border: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      cursor: 'pointer'
    }}
  >
    {icon}
  </button>
)

const InsightCard = ({ icon, title, value, sub }: { icon: React.ReactNode, title: string, value: string | number, sub: string }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: 12,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    minWidth: 140,
    border: '1px solid #f1f5f9'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {icon}
      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{title}</span>
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
      {sub}
    </div>
  </div>
)
