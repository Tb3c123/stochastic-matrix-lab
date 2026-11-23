"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { SumRangeAreaCard } from "./charts/SumRangeAreaCard";
import { ParityBarCard } from "./charts/ParityBarCard";

interface SumDistributionProps {
  gameCode: string;
}

const DEFAULT_SUM_RANGES: Record<string, number> = {
  "< 100": 2,
  "100 - 119": 8,
  "120 - 139": 16,
  "140 - 159": 14,
  "160 - 179": 7,
  "180 - 199": 2,
  ">= 200": 1
};

const DEFAULT_PARITY_DIST: Record<string, number> = {
  "0C : 6L": 1,
  "1C : 5L": 5,
  "2C : 4L": 12,
  "3C : 3L": 18,
  "4C : 2L": 11,
  "5C : 1L": 3,
  "6C : 0L": 0
};

export const SumDistributionChart: React.FC<SumDistributionProps> = ({
  gameCode
}) => {
  const [distData, setDistData] = useState<any>(null);
  const [, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDistribution = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/analytics/distribution?game_code=${gameCode}&window_size=100`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setDistData(json.data);
        }
      } catch (e) {
        console.error("Fetch distribution failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [gameCode]);

  const sumData = Object.entries(
    distData?.sum_ranges || DEFAULT_SUM_RANGES
  ).map(([range, count]: [string, any]) => ({
    range,
    "Số kỳ xuất hiện": count
  }));

  const parityData = Object.entries(
    distData?.odd_even_distribution || DEFAULT_PARITY_DIST
  ).map(([ratio, count]: [string, any]) => ({
    ratio,
    "Tần suất": count
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SumRangeAreaCard data={sumData} />
      <ParityBarCard data={parityData} />
    </div>
  );
};
