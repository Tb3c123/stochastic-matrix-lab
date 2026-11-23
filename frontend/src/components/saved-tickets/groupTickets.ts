export interface TicketDateGroup {
  period: string;
  date: string;
  tickets: any[];
  totalPrize: number;
  winningTicketsCount: number;
  totalRows: number;
  goldenRowsCount: number;
  goldenTicketsCount: number;
}

export function groupTicketsByDate(
  filteredTickets: any[]
): Array<[string, TicketDateGroup]> {
  const groupsMap: Record<string, TicketDateGroup> = {};

  filteredTickets.forEach((t) => {
    const key = t.target_draw_period || t.target_draw_date || "Chưa xác định";
    if (!groupsMap[key]) {
      groupsMap[key] = {
        period: t.target_draw_period || "",
        date: t.target_draw_date || "",
        tickets: [],
        totalPrize: 0,
        winningTicketsCount: 0,
        totalRows: 0,
        goldenRowsCount: 0,
        goldenTicketsCount: 0
      };
    }
    groupsMap[key].tickets.push(t);
    groupsMap[key].totalRows += t.rows_count || t.rows?.length || 0;
    const gRows =
      t.golden_rows_count ?? t.predicted_analysis?.golden_rows_count ?? 0;
    groupsMap[key].goldenRowsCount += gRows;
    if (t.has_golden_signal || gRows > 0) {
      groupsMap[key].goldenTicketsCount += 1;
    }
    const prize = t.matched_results?.total_prize_vnd || 0;
    groupsMap[key].totalPrize += prize;
    if (prize > 0) {
      groupsMap[key].winningTicketsCount += 1;
    }
  });

  Object.values(groupsMap).forEach((grp) => {
    grp.tickets.sort((tA, tB) => {
      const gA = tA.has_golden_signal ? 1 : 0;
      const gB = tB.has_golden_signal ? 1 : 0;
      if (gB !== gA) return gB - gA;
      const sA =
        tA.ticket_beauty_score ??
        tA.predicted_analysis?.ticket_beauty_score ??
        0;
      const sB =
        tB.ticket_beauty_score ??
        tB.predicted_analysis?.ticket_beauty_score ??
        0;
      if (sB !== sA) return sB - sA;
      return (tB.id || 0) - (tA.id || 0);
    });
  });

  return Object.entries(groupsMap).sort(([keyA, a], [keyB, b]) => {
    if (a.date && b.date) {
      return b.date.localeCompare(a.date);
    }
    return keyB.localeCompare(keyA, undefined, { numeric: true });
  });
}
