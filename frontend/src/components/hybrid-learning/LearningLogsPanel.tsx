"use client";

import React from "react";
import { Activity } from "lucide-react";

interface LearningLogsPanelProps {
  learningLogs: any[];
}

export const LearningLogsPanel: React.FC<LearningLogsPanelProps> = ({
  learningLogs
}) => {
  if (learningLogs.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-violet-400" /> Nhật Ký Tự Học Hỏi
        & Dịch Chuyển Bậc Thang Gần Nhất
      </div>
      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
        {learningLogs
          .slice(-4)
          .reverse()
          .map((log: any, idx: number) => (
            <div
              key={idx}
              className="bg-slate-850/50 p-2.5 rounded-xl border border-slate-800/60 text-slate-300 flex items-start gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0"></span>
              <div>
                <span className="text-slate-500 font-mono mr-2">
                  {log.timestamp
                    ? log.timestamp.slice(0, 16).replace("T", " ")
                    : ""}
                </span>
                <span>{log.feedback_summary || log.event}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
