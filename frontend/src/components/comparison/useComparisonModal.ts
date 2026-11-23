import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";

export function useComparisonModal(
  gameCode: string,
  numbers: number[],
  onClose: () => void,
  onSaveAndTrack?: () => void
) {
  const [upcomingInfo, setUpcomingInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchUpcoming = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/tickets/upcoming?game_code=${gameCode}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setUpcomingInfo(json.data);
        }
      } catch (e) {
        console.error("Fetch upcoming draw info failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [gameCode]);

  const handleSaveThisTicket = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tickets/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_code: gameCode,
          strategy: "balanced",
          rows: [[...numbers].sort((a, b) => a - b)]
        })
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        if (onSaveAndTrack) onSaveAndTrack();
        setTimeout(() => onClose(), 1500);
      }
    } catch (e) {
      console.error("Save ticket failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return { upcomingInfo, loading, saving, saveSuccess, handleSaveThisTicket };
}
