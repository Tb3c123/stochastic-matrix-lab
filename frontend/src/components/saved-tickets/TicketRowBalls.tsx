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
  isSpecialMatch,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {row.map((num) => {
      const isMatch = matchedNums.includes(num);
      return (
        <span
          key={num}
          className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center font-mono ${
            isMatch
              ? "bg-emerald-700 text-white border border-emerald-800"
              : "ball-red"
          }`}
        >
          {num < 10 ? `0${num}` : num}
        </span>
      );
    })}
    {isPower && (
      <div className="flex items-center gap-1.5 pl-1">
        <span className="text-slate-400 font-bold text-xs">+</span>
        <span
          className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center font-mono ${
            isSpecialMatch
              ? "bg-amber-600 text-white border border-amber-700"
              : "ball-special"
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
