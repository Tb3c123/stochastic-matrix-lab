"use client";

import React from "react";

export const DistributionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-md text-xs space-y-1">
        <p className="font-bold text-slate-900 border-b border-slate-200 pb-1">
          {label}
        </p>
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-600">{payload[0].name}:</span>
          <span className="font-bold text-slate-900 font-mono">
            {payload[0].value} kỳ
          </span>
        </div>
      </div>
    );
  }
  return null;
};
