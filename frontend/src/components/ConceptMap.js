"use client";
import { useEffect, useRef } from "react";

const NODE_COLORS = {
  central: { bg: "#c17b2e", text: "#ffffff", size: 120 },
  major: { bg: "#2c2416", text: "#f5f0e8", size: 100 },
  minor: { bg: "#f0e0c8", text: "#2c2416", size: 80 },
};

export default function ConceptMap({ nodes, edges }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!nodes || !edges) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Layout nodes in a circle
    const positions = {};
    const central = nodes.filter(n => n.type === "central");
    const major = nodes.filter(n => n.type === "major");
    const minor = nodes.filter(n => n.type === "minor");

    // Central nodes in middle
    central.forEach((n, i) => {
      positions[n.id] = {
        x: W / 2 + (i - central.length / 2) * 150,
        y: H / 2,
      };
    });

    // Major nodes in inner ring
    major.forEach((n, i) => {
      const angle = (i / major.length) * 2 * Math.PI - Math.PI / 2;
      positions[n.id] = {
        x: W / 2 + Math.cos(angle) * 200,
        y: H / 2 + Math.sin(angle) * 180,
      };
    });

    // Minor nodes in outer ring
    minor.forEach((n, i) => {
      const angle = (i / minor.length) * 2 * Math.PI - Math.PI / 2;
      positions[n.id] = {
        x: W / 2 + Math.cos(angle) * 350,
        y: H / 2 + Math.sin(angle) * 300,
      };
    });

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Draw edges
    edges.forEach(edge => {
      const from = positions[edge.source];
      const to = positions[edge.target];
      if (!from || !to) return;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = "#c8b898";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Edge label
      if (edge.label) {
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        ctx.font = "11px Plus Jakarta Sans";
        ctx.fillStyle = "#8b7355";
        ctx.textAlign = "center";
        ctx.fillText(edge.label, mx, my - 4);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;
      const style = NODE_COLORS[node.type] || NODE_COLORS.minor;
      const r = style.size / 2;

      // Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = style.bg;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = `${node.type === "central" ? "bold " : ""}13px Plus Jakarta Sans`;
      ctx.fillStyle = style.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Word wrap
      const words = node.label.split(" ");
      const lines = [];
      let line = "";
      words.forEach(word => {
        const test = line + (line ? " " : "") + word;
        if (ctx.measureText(test).width > r * 1.6) {
          if (line) lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);

      const lineH = 16;
      const startY = pos.y - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, i) => {
        ctx.fillText(l, pos.x, startY + i * lineH);
      });
    });

  }, [nodes, edges]);

  return (
    <div className="bg-white border border-cream-darker rounded-2xl p-4 overflow-auto">
      <div className="flex gap-4 mb-4 text-xs text-ink-light">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber inline-block" /> Central concept
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-ink inline-block" /> Major concept
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-pale border border-amber-pale inline-block" /> Supporting detail
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full rounded-xl"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
}