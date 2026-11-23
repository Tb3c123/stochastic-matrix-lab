"use client";

import React from "react";

interface SmartPickBallInputsProps {
  inputs: string[];
  error?: string;
  isPower: boolean;
  specialInput?: string;
  onInputChange: (inputIdx: number, val: string) => void;
  onSpecialChange: (val: string) => void;
}

export const SmartPickBallInputs: React.FC<SmartPickBallInputsProps> = ({
  inputs,
  error,
  isPower,
  specialInput,
  onInputChange,
  onSpecialChange
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {inputs.map((val, inputIdx) => (
      <input
        key={inputIdx}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={val}
        placeholder="--"
        onChange={(e) => onInputChange(inputIdx, e.target.value)}
        className={`w-10 h-10 md:w-11 md:h-11 rounded-full text-center font-bold text-sm md:text-base transition-all focus:outline-none focus:ring-2 ${
          val !== "" && !error
            ? "ball-red text-white border-0 shadow-md"
            : "bg-slate-900 border border-slate-700 text-slate-200 focus:ring-amber-500 placeholder-slate-600"
        }`}
      />
    ))}

    {isPower && (
      <div className="flex items-center gap-1.5 pl-1">
        <span className="text-amber-500 font-extrabold text-base md:text-lg">
          +
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={specialInput || ""}
          placeholder="DB"
          title="Số đặc biệt Jackpot 2 (01-55)"
          onChange={(e) => onSpecialChange(e.target.value)}
          className={`w-10 h-10 md:w-11 md:h-11 rounded-full text-center font-black text-sm md:text-base transition-all focus:outline-none focus:ring-2 ring-amber-400/30 ${
            specialInput && specialInput !== ""
              ? "ball-gold text-slate-950 border-0 shadow-lg ring-2 ring-amber-400"
              : "bg-slate-900 border border-amber-500/40 text-amber-300 focus:ring-amber-400 placeholder-amber-500/50"
          }`}
        />
      </div>
    )}
  </div>
);
