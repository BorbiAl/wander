"use client";
import React from "react";
import { motion, useAnimationFrame } from "framer-motion";

// SVG path for world landmasses (centered on Eastern Europe/Bulgaria)
// This is a simplified but accurate path for demo; replace with more detailed data if needed
const LAND_PATH =
  "M 250,160 Q 260,120 300,110 Q 340,120 350,160 Q 340,200 300,210 Q 260,200 250,160 Z " +
  "M 180,120 Q 200,100 240,90 Q 280,100 300,120 Q 280,140 240,150 Q 200,140 180,120 Z " +
  "M 210,200 Q 220,180 260,170 Q 300,180 310,200 Q 300,220 260,230 Q 220,220 210,200 Z " +
  "M 320,250 Q 340,240 360,260 Q 350,280 320,290 Q 300,280 320,250 Z ";

// Amber nodes (villages) with one at Bulgaria (center)
const NODES = [
  { x: 250, y: 160, pulse: true }, // Bulgaria
  { x: 300, y: 110 },
  { x: 340, y: 120 },
  { x: 280, y: 140 },
  { x: 220, y: 180 },
  { x: 320, y: 250 },
  { x: 360, y: 260 },
  { x: 300, y: 210 },
  { x: 260, y: 230 },
];

// Network lines (curved, dashed)
const LINES = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 0, to: 3 },
  { from: 0, to: 4 },
  { from: 1, to: 5 },
  { from: 2, to: 6 },
  { from: 3, to: 7 },
  { from: 4, to: 8 },
];

// Utility to get SVG arc path between two points (for network lines)
function arcPath(x1: number, y1: number, x2: number, y2: number, r = 80) {
  // Calculate midpoint for arc
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - r;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
}

export default function HyperRealisticGlobe({ className = "" }: { className?: string }) {
  // Rotation state (degrees)
  const [deg, setDeg] = React.useState(0);
  // Animate rotation
  useAnimationFrame((t) => {
    setDeg((prev) => (prev + 0.06) % 360); // ~1 deg/sec
  });

  // Responsive size
  const size = 500;
  const center = size / 2;
  const radius = 200;

  return (
    <div
      className={`flex items-center justify-center w-full h-full ${className}`}
      style={{ background: "transparent" }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: 500, maxHeight: 500, minWidth: 256, minHeight: 256 }}
      >
        <defs>
          {/* Sphere gradients */}
          <radialGradient id="sphereGradient" cx="60%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#222" />
            <stop offset="60%" stopColor="#050505" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          {/* Shadow overlay */}
          <radialGradient id="shadowGradient" cx="80%" cy="80%" r="80%">
            <stop offset="60%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.7" />
          </radialGradient>
          {/* Glow for atmosphere */}
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </radialGradient>
          {/* Landmass filter: subtle specular lighting */}
          <filter id="landLighting" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="2" specularConstant="1" specularExponent="20" lighting-color="#fff" result="spec" >
              <fePointLight x="180" y="80" z="200" />
            </feSpecularLighting>
            <feComposite in="SourceGraphic" in2="spec" operator="arithmetic" k1="1" k2="0.5" k3="0.5" k4="0" />
          </filter>
          {/* Node glow */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Pulse animation for Bulgaria node */}
          <radialGradient id="pulseGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Outer glow (atmosphere) */}
        <circle
          cx={center}
          cy={center}
          r={radius + 18}
          fill="url(#glowGradient)"
          style={{ filter: "blur(8px)" }}
        />
        {/* Main sphere */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="url(#sphereGradient)"
        />
        {/* Shadow overlay */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="url(#shadowGradient)"
        />
        {/* Landmasses (rotating group) */}
        <motion.g
          style={{ originX: center, originY: center }}
          animate={{ rotate: deg }}
          transition={{ ease: "linear", duration: 0 }}
        >
          <path
            d={LAND_PATH}
            fill="#10b981"
            fillOpacity={0.4}
            stroke="#10b981"
            strokeWidth={2}
            filter="url(#landLighting)"
          />
        </motion.g>
        {/* Network lines */}
        {LINES.map((line, i) => {
          const from = NODES[line.from];
          const to = NODES[line.to];
          return (
            <path
              key={i}
              d={arcPath(from.x, from.y, to.x, to.y, 80)}
              stroke="#10b981"
              strokeWidth={0.5}
              strokeDasharray="4 3"
              fill="none"
              opacity={0.7}
            />
          );
        })}
        {/* Nodes (villages) */}
        {NODES.map((node, i) => (
          <React.Fragment key={i}>
            {/* Pulse for Bulgaria node */}
            {node.pulse && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={18}
                fill="url(#pulseGradient)"
                style={{ filter: "blur(2px)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.2, 0.7] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.pulse ? 7 : 5}
              fill="#fbbf24"
              filter="url(#nodeGlow)"
              stroke="#fff"
              strokeWidth={node.pulse ? 1.5 : 1}
            />
          </React.Fragment>
        ))}
      </svg>
    </div>
  );
}