"use client";

import React from "react";

export const DistributionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1">
        <p className="font-bold text-white border-b border-slate-800 pb-1">
          {label}
        </p>
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-400">{payload[0].name}:</span>
          <span className="font-bold text-amber-400 font-mono">
            {payload[0].value} kỳ
          </span>
        </div>
      </div>
    );
  }
  return null;
};
