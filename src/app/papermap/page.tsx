'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as d3 from 'd3';

interface Node {
    id: string;
    title: string;
    description: string;
    parentId: string | null;
    level: number;
    children?: Node[];
    _children?: Node[]; // Store collapsed nodes
}

interface HierarchyNode extends d3.HierarchyNode<Node> {
    x0?: number;
    y0?: number;
    _children?: d3.HierarchyNode<Node>[];
}

export default function PaperMap() {
    const [isLoading, setIsLoading] = useState(false);
    const [nodes, setNodes] = useState<Node[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            const response = await fetch('/api/papermap', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.nodes) {
                setNodes(data.nodes);
            }
        } catch (error) {
            console.error('Error processing PDF:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!nodes.length || !svgRef.current) return;

        // Clear previous visualization
        d3.select(svgRef.current).selectAll("*").remove();

        const margin = { top: 50, right: 120, bottom: 50, left: 120 };
        const width = 1200 - margin.left - margin.right;
        const height = 800 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        // Create a container group for all elements
        const container = svg.append("g")
            .attr("class", "container")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create hierarchical layout
        const root = d3.stratify<Node>()
            .id(d => d.id)
            .parentId(d => d.parentId)
            (nodes);

        // Apply the tree layout
        const treeLayout = d3.tree<Node>()
            .nodeSize([100, 200])  // Set consistent node spacing [vertical, horizontal]
            .separation((a, b) => {
                return a.parent === b.parent ? 1.5 : 2;  // Increase separation between different branches
            });

        // Initial layout computation
        treeLayout(root);

        // Function to toggle children
        function toggleChildren(d: HierarchyNode) {
            if (d.children) {
                d._children = d.children;
                d.children = undefined;
            } else {
                d.children = d._children;
                d._children = undefined;
            }
            update(d);
        }

        // Function to update the visualization
        function update(source: HierarchyNode) {
            const duration = 750;

            // Compute the new tree layout
            treeLayout(root);
            const nodes = root.descendants() as HierarchyNode[];
            const links = root.links();

            // Normalize for fixed-depth and center the tree
            nodes.forEach(d => {
                // Swap x and y for horizontal layout
                const oldX = d.x;
                d.x = d.y;
                d.y = oldX;
            });

            // Update nodes
            const node = container.selectAll("g.node")
                .data(nodes, d => (d as any).id);

            // Enter new nodes
            const nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${source.y0 || source.y},${source.x0 || source.x})`)
                .on("click", (event, d) => {
                    if (d.children || d._children) {
                        toggleChildren(d);
                    }
                });

            // Add circles for nodes
            nodeEnter.append("circle")
                .attr("r", 6)
                .attr("fill", d => d._children ? "#4CAF50" : "#fff")
                .attr("stroke", "#2E7D32")
                .attr("stroke-width", 2)
                .style("cursor", d => d.children || d._children ? "pointer" : "default");

            // Add title text
            nodeEnter.append("text")
                .attr("dy", d => d.children || d._children ? "-1.5em" : "0.35em")
                .attr("x", d => d.children || d._children ? 0 : 12)
                .attr("text-anchor", d => d.children || d._children ? "middle" : "start")
                .attr("font-weight", "bold")
                .text(d => d.data.title)
                .attr("fill", "#333")
                .each(function(d) {
                    // Add background rectangle for better readability
                    const bbox = (this as SVGTextElement).getBBox();
                    const padding = 2;
                    d3.select(this.parentNode as Element)
                        .insert("rect", "text")
                        .attr("x", bbox.x - padding)
                        .attr("y", bbox.y - padding)
                        .attr("width", bbox.width + (padding * 2))
                        .attr("height", bbox.height + (padding * 2))
                        .attr("fill", "white")
                        .attr("fill-opacity", 0.9);
                });

            // Add description text
            nodeEnter.append("foreignObject")
                .attr("x", -60)
                .attr("y", d => d.children || d._children ? "1em" : "-0.5em")
                .attr("width", 120)
                .attr("height", 80)
                .append("xhtml:div")
                .style("font-size", "0.8em")
                .style("color", "#666")
                .style("text-align", "center")
                .style("overflow", "hidden")
                .text(d => d.data.description);

            // Update existing nodes
            const nodeUpdate = nodeEnter.merge(node as any)
                .transition()
                .duration(duration)
                .attr("transform", d => `translate(${d.y},${d.x})`);

            nodeUpdate.select("circle")
                .attr("fill", d => d._children ? "#4CAF50" : "#fff");

            // Remove old nodes
            const nodeExit = node.exit()
                .transition()
                .duration(duration)
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .remove();

            // Update links
            const link = container.selectAll<SVGPathElement, d3.HierarchyLink<Node>>("path.link")
                .data(links, (d: d3.HierarchyLink<Node>) => (d.target as unknown as HierarchyNode).id ?? '');

            // Enter new links
            const linkEnter = link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", d => {
                    const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
                    return diagonal({ source: o, target: o });
                })
                .attr("fill", "none")
                .attr("stroke", "#888")
                .attr("stroke-width", 2);

            // Update existing links
            linkEnter.merge(link as any)
                .transition()
                .duration(duration)
                .attr("d", diagonal);

            // Remove old links
            link.exit()
                .transition()
                .duration(duration)
                .attr("d", d => {
                    const o = { x: source.x, y: source.y };
                    return diagonal({ source: o, target: o });
                })
                .remove();

            // Store old positions for transition
            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            // Add tooltip behavior
            nodeEnter.on("mouseover", function(event, d) {
                const [x, y] = d3.pointer(event, svg.node() as Element);
                const tooltip = container.append("g")
                    .attr("class", "tooltip")
                    .attr("transform", `translate(${x + 20},${y + 20})`);

            });
        }

        // Creates a curved path from parent to child nodes
        function diagonal(d: any) {
            return `M ${d.source.y} ${d.source.x}
                    C ${(d.source.y + d.target.y) / 2} ${d.source.x},
                      ${(d.source.y + d.target.y) / 2} ${d.target.x},
                      ${d.target.y} ${d.target.x}`;
        }

        // Initialize the display
        (root as HierarchyNode).x0 = height / 2;
        (root as HierarchyNode).y0 = 0;
        update(root);

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                container.attr("transform", event.transform);
            });

        // Calculate the initial transform to center the tree
        const rootNode = nodes[0];
        const initialTransform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(0.8);

        svg.call(zoom)
           .call(zoom.transform, initialTransform);

    }, [nodes]);

    return (
        <div className="container mx-auto p-8">
            <Card className="p-6">
                <h1 className="text-2xl font-bold mb-6">Papermap</h1>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                            className="max-w-md"
                        />
                        {isLoading && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        )}
                    </div>
                    
                    <div className="relative mt-8 border rounded-lg overflow-hidden bg-white">
                        <svg 
                            ref={svgRef}
                            className="w-full h-[800px]"
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}
