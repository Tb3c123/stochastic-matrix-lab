export interface CountdownState {
  targetDateStr: string;
  targetDayOfWeek: string;
  nextPeriodStr: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isFinalBuyWindow: boolean;
  isSalesClosed: boolean;
}

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export function calculateNextDrawCountdown(
  gameCode: string,
  currentDrawPeriod?: string,
  latestDrawDate?: string
): CountdownState {
  const now = new Date();
  const validDays = gameCode === "power_6_55" ? [2, 4, 6] : [0, 3, 5];

  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const todayIso = `${y}-${m}-${d}`;
  const todayLanded = Boolean(latestDrawDate && latestDrawDate === todayIso);

  let target = new Date(now);
  target.setHours(18, 0, 0, 0);

  const isTodayValid = validDays.includes(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  const isPastTodayDraw = todayLanded || mins >= 18 * 60 + 45;

  if (!isTodayValid || isPastTodayDraw) {
    let daysToAdd = 1;
    while (true) {
      const testDate = new Date(now);
      testDate.setDate(now.getDate() + daysToAdd);
      if (validDays.includes(testDate.getDay())) {
        target = new Date(testDate);
        target.setHours(18, 0, 0, 0);
        break;
      }
      daysToAdd++;
    }
  }

  const diffMs = target.getTime() - now.getTime();
  const isLive = isTodayValid && !todayLanded && mins >= 18 * 60 && mins < 18 * 60 + 45;
  const isFinalBuyWindow = isTodayValid && !todayLanded && mins >= 16 * 60 + 30 && mins < 17 * 60 + 45;
  const isSalesClosed = isTodayValid && !todayLanded && mins >= 17 * 60 + 45 && mins < 18 * 60 + 45;

  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((diffMs / 1000 / 60) % 60));
  const seconds = Math.max(0, Math.floor((diffMs / 1000) % 60));

  const targetDayOfWeek = DAY_NAMES[target.getDay()];
  const dayStr = target.getDate().toString().padStart(2, "0");
  const monthStr = (target.getMonth() + 1).toString().padStart(2, "0");
  const targetDateStr = `${dayStr}/${monthStr}/${target.getFullYear()}`;

  let nextPeriodStr = "";
  if (currentDrawPeriod) {
    const pNum = parseInt(currentDrawPeriod.replace(/\D/g, ""), 10);
    if (!isNaN(pNum)) nextPeriodStr = `#${(pNum + 1).toString().padStart(5, "0")}`;
  }

  return {
    targetDateStr,
    targetDayOfWeek,
    nextPeriodStr,
    days,
    hours,
    minutes,
    seconds,
    isLive,
    isFinalBuyWindow,
    isSalesClosed,
  };
}
