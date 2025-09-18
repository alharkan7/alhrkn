'use client'

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node {
  id: string
  label: string
  level: number
  position?: { x: number; y: number }
  parent?: string | null
  children?: Node[]
}

interface Connection {
  from: string
  to: string
  type?: string
  label?: string
}

interface DiagramData {
  title: string
  type: string
  nodes: Node[]
  connections: Connection[]
  layout?: {
    orientation: string
    alignment: string
  }
}

interface DiagramRendererProps {
  data: DiagramData
  width?: number
  height?: number
}

const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  data,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes || data.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Create a simple tree layout
    const margin = { top: 20, right: 120, bottom: 20, left: 120 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create hierarchical data structure
    const root = createHierarchy(data.nodes)

    // Create tree layout
    const treeLayout = d3.tree<Node>()
      .size([innerHeight, innerWidth])
      .nodeSize([100, 200]) // [vertical spacing, horizontal spacing]

    const treeData = treeLayout(d3.hierarchy(root, d => d.children))

    // Create links
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x((d: any) => d.y)
      .y((d: any) => d.x)

    g.selectAll('.link')
      .data(treeData.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => linkGenerator(d))
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2)

    // Create nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)

    // Add circles for nodes
    nodes.append('circle')
      .attr('r', 40)
      .attr('fill', d => getNodeColor(d.data.level))
      .attr('stroke', '#333')
      .attr('stroke-width', 2)

    // Add text labels
    nodes.append('text')
      .attr('dy', '.35em')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => {
        const words = d.data.label.split(' ')
        if (words.length <= 3) return d.data.label
        return words.slice(0, 3).join(' ') + '...'
      })
      .each(function(d) {
        const text = d3.select(this)
        const words = d.data.label.split(' ')

        if (words.length > 3) {
          // Wrap text if it's long
          text.text('')
          words.slice(0, 3).forEach((word, i) => {
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', i === 0 ? 0 : '1.2em')
              .text(word)
          })
          text.append('tspan')
            .attr('x', 0)
            .attr('dy', '1.2em')
            .text('...')
        }
      })

    // Add tooltips for full text
    nodes.append('title')
      .text(d => d.data.label)

  }, [data, width, height])

  // Helper function to create hierarchy from flat nodes
  const createHierarchy = (nodes: Node[]): Node => {
    const nodeMap = new Map<string, Node>()
    let root: Node | null = null

    // Create node map
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    // Build hierarchy
    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!
      if (node.parent === null) {
        root = nodeWithChildren
      } else if (node.parent) {
        const parent = nodeMap.get(node.parent)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(nodeWithChildren)
        }
      }
    })

    return root || nodes[0]
  }

  // Helper function to get node colors based on level
  const getNodeColor = (level: number): string => {
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
    ]
    return colors[level % colors.length]
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-center">{data.title}</h3>
        <p className="text-sm text-muted-foreground text-center">Type: {data.type}</p>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block"
        />
      </div>
      <div className="mt-4 text-xs text-muted-foreground text-center">
        Hover over nodes to see full text • {data.nodes.length} nodes
      </div>
    </div>
  )
}

export default DiagramRenderer
