'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { VILLAGES, EXPERIENCES } from '@/app/lib/data';
import { cwsColor } from '@/app/lib/utils';

// ---------------------------------------------------------------------------
// Graph data built from static data (mirrors what C++ exports at /graph/export)
// ---------------------------------------------------------------------------
type GNode = {
  id: string;
  type: 'village' | 'experience';
  name: string;
  subtype?: string;
  cws?: number;
  region?: string;
  // physics
  x: number; y: number;
  vx: number; vy: number;
  fixed?: boolean;
};

type GEdge = { source: string; target: string };

function buildGraph() {
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const nodeMap = new Map<string, GNode>();

  // Subsample: first 12 villages + 3 experiences each = ~48 nodes (demo-sized)
  const villages = VILLAGES.slice(0, 12);

  for (const v of villages) {
    const node: GNode = {
      id: v.id, type: 'village', name: v.name,
      region: v.region, cws: v.cws,
      x: Math.random() * 700 + 50, y: Math.random() * 450 + 50,
      vx: 0, vy: 0,
    };
    nodes.push(node);
    nodeMap.set(v.id, node);
  }

  const villageIds = new Set(villages.map(v => v.id));
  const usedExps = EXPERIENCES.filter(e => villageIds.has(e.villageId)).slice(0, 36);

  for (const e of usedExps) {
    const node: GNode = {
      id: e.id, type: 'experience', name: e.name, subtype: e.type,
      x: Math.random() * 700 + 50, y: Math.random() * 450 + 50,
      vx: 0, vy: 0,
    };
    nodes.push(node);
    nodeMap.set(e.id, node);
    edges.push({ source: e.villageId, target: e.id });
  }

  // Nearby village edges
  for (const v of villages) {
    for (const nid of v.nearby) {
      if (villageIds.has(nid) && v.id < nid) {
        edges.push({ source: v.id, target: nid });
      }
    }
  }

  return { nodes, edges, nodeMap };
}

const EXP_TYPE_COLOR: Record<string, string> = {
  craft: '#F5A623', hike: '#F87171', homestay: '#60A5FA',
  ceremony: '#A78BFA', cooking: '#FB923C', volunteer: '#34D399', folklore: '#E879F9',
};

// ---------------------------------------------------------------------------
// Force simulation (spring layout, runs in requestAnimationFrame)
// ---------------------------------------------------------------------------
const REPEL = 3500;
const ATTRACT = 0.04;
const DAMPING = 0.82;
const CENTER_PULL = 0.012;

function tick(nodes: GNode[], edges: GEdge[], nodeMap: Map<string, GNode>, W: number, H: number) {
  const cx = W / 2, cy = H / 2;

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist2 = dx * dx + dy * dy + 1;
      const force = REPEL / dist2;
      const fx = force * dx / Math.sqrt(dist2);
      const fy = force * dy / Math.sqrt(dist2);
      if (!a.fixed) { a.vx += fx; a.vy += fy; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
    }
  }

  // Attraction along edges
  for (const e of edges) {
    const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const targetDist = a.type === 'village' && b.type === 'village' ? 120 : 80;
    const force = (dist - targetDist) * ATTRACT;
    const fx = force * dx / dist, fy = force * dy / dist;
    if (!a.fixed) { a.vx += fx; a.vy += fy; }
    if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
  }

  // Center pull + integrate
  for (const n of nodes) {
    if (n.fixed) continue;
    n.vx += (cx - n.x) * CENTER_PULL;
    n.vy += (cy - n.y) * CENTER_PULL;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(20, Math.min(W - 20, n.x));
    n.y = Math.max(20, Math.min(H - 20, n.y));
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const graphRef = useRef(buildGraph());
  const [, forceRender] = useState(0);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [filter, setFilter] = useState<'all' | 'village' | 'experience'>('all');
  const [settled, setSettled] = useState(false);
  const draggingRef = useRef<GNode | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setDims({ w: rect.width, h: rect.height });
    });
    if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  const { nodes, edges, nodeMap } = graphRef.current;

  // Run simulation
  useEffect(() => {
    let frame = 0;
    function loop() {
      tick(nodes, edges, nodeMap, dims.w, dims.h);
      frame++;
      forceRender(f => f + 1);
      if (frame < 200) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        setSettled(true);
      }
    }
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [dims]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent, node: GNode) => {
    e.stopPropagation();
    node.fixed = true;
    draggingRef.current = node;
    setSettled(false);
    animRef.current = requestAnimationFrame(function loop() {
      forceRender(f => f + 1);
      animRef.current = requestAnimationFrame(loop);
    });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    draggingRef.current.x = e.clientX - rect.left;
    draggingRef.current.y = e.clientY - rect.top;
  }, []);

  const onMouseUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current.fixed = false;
      draggingRef.current = null;
    }
    cancelAnimationFrame(animRef.current);
    setSettled(true);
  }, []);

  const visibleNodes = filter === 'all' ? nodes : nodes.filter(n => n.type === filter);
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="flex flex-col h-[calc(100vh-3.5rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] shrink-0">
        <div>
          <h1 className="font-display text-2xl text-white">Knowledge Graph</h1>
          <p className="text-text-3 text-xs mt-0.5">
            {nodes.filter(n => n.type === 'village').length} villages · {nodes.filter(n => n.type === 'experience').length} experiences · {edges.length} relationships
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'village', 'experience'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-pill border transition-colors ${filter === f ? 'bg-accent text-black border-accent' : 'border-[#333] text-text-2 hover:border-[#555]'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Graph + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-[#050505]">
          {!settled && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-text-3 bg-[#111] px-3 py-1 rounded-pill border border-[#222] z-10">
              Simulating layout…
            </div>
          )}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#333" />
              </marker>
            </defs>

            {/* Edges */}
            {visibleEdges.map((e, i) => {
              const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
              if (!a || !b) return null;
              const isCross = a.type !== b.type;
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isCross ? '#2a2a2a' : '#1e1e1e'}
                  strokeWidth={isCross ? 1 : 1.5}
                  strokeDasharray={isCross ? '3 3' : undefined}
                />
              );
            })}

            {/* Nodes */}
            {visibleNodes.map(node => {
              const isVillage = node.type === 'village';
              const r = isVillage ? 14 : 7;
              const color = isVillage
                ? cwsColor(node.cws ?? 50)
                : EXP_TYPE_COLOR[node.subtype ?? ''] ?? '#888';
              const isSelected = selected?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelected(node)}
                  onMouseDown={e => onMouseDown(e, node)}
                >
                  {isSelected && (
                    <circle r={r + 6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
                  )}
                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={isVillage ? 0.9 : 0.75}
                    stroke={isSelected ? color : '#111'}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {isVillage && (
                    <text
                      dy={-r - 5}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#aaa"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info sidebar */}
        <div className="w-64 shrink-0 border-l border-[#222] bg-bg p-5 overflow-y-auto flex flex-col gap-5">
          {/* Legend */}
          <div>
            <div className="text-[10px] uppercase text-text-3 mb-3">Node types</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-text-2">
                <div className="w-3.5 h-3.5 rounded-full bg-accent opacity-90" />
                Village (high CWS)
              </div>
              <div className="flex items-center gap-2 text-xs text-text-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#F5A623] opacity-90" />
                Village (medium CWS)
              </div>
              <div className="flex items-center gap-2 text-xs text-text-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF4444] opacity-90" />
                Village (pioneer)
              </div>
              <div className="border-t border-[#1e1e1e] my-1" />
              {Object.entries(EXP_TYPE_COLOR).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-text-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {type}
                </div>
              ))}
            </div>
          </div>

          {/* Selected node info */}
          {selected ? (
            <div className="bg-surface border border-[#222] rounded-card p-4">
              <div className="text-[10px] uppercase text-text-3 mb-2">{selected.type}</div>
              <div className="font-display text-lg text-white leading-tight mb-3">{selected.name}</div>
              {selected.type === 'village' && (
                <>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-2">Region</span>
                    <span className="text-white">{selected.region}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-2">CWS</span>
                    <span className="font-bold" style={{ color: cwsColor(selected.cws ?? 50) }}>
                      {selected.cws}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${selected.cws}%`, backgroundColor: cwsColor(selected.cws ?? 50) }}
                    />
                  </div>
                </>
              )}
              {selected.type === 'experience' && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: EXP_TYPE_COLOR[selected.subtype ?? ''] ?? '#888' }}
                  />
                  <span className="text-text-2 text-sm capitalize">{selected.subtype}</span>
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                className="mt-4 text-xs text-text-3 hover:text-white transition-colors"
              >
                Deselect
              </button>
            </div>
          ) : (
            <div className="text-xs text-text-3 italic">Click a node to inspect it. Drag to reposition.</div>
          )}

          <div className="text-[10px] text-text-3 mt-auto border-t border-[#1e1e1e] pt-4">
            Graph powered by C++ PropertyGraph with Personalized PageRank
          </div>
        </div>
      </div>
    </motion.div>
  );
}
