"use client";

import React from "react";

interface TicketRowBallsProps {
  row: number[];
  matchedNums: number[];
  isPower: boolean;
  specialNum: number | null;
  isSpecialMatch: boolean;
}

export const TicketRowBalls: React.FC<TicketRowBallsProps> = ({
  row,
  matchedNums,
  isPower,
  specialNum,
  isSpecialMatch
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {row.map((num) => {
      const isMatch = matchedNums.includes(num);
      return (
        <span
          key={num}
          className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
            isMatch
              ? "bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg scale-105"
              : "ball-red text-white"
          }`}
        >
          {num < 10 ? `0${num}` : num}
        </span>
      );
    })}
    {isPower && (
      <div className="flex items-center gap-1.5 pl-1">
        <span className="text-amber-500 font-extrabold text-xs">+</span>
        <span
          className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center transition-all ${
            isSpecialMatch
              ? "bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 ring-4 ring-yellow-300/50 shadow-lg shadow-amber-500/50 scale-110 animate-pulse border-2 border-white"
              : "bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20"
          }`}
          title={`Số đặc biệt Power 6/55: ${
            specialNum ? (specialNum < 10 ? `0${specialNum}` : specialNum) : "ĐB"
          }${isSpecialMatch ? " (TRÚNG ĐẶC BIỆT!)" : ""}`}
        >
          {specialNum ? (specialNum < 10 ? `0${specialNum}` : specialNum) : "★"}
        </span>
      </div>
    )}
  </div>
);
