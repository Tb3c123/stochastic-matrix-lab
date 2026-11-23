export interface CountdownState {
  targetDateStr: string;
  targetDayOfWeek: string;
  nextPeriodStr: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy"
];

export function calculateNextDrawCountdown(
  gameCode: string,
  currentDrawPeriod?: string
): CountdownState {
  const now = new Date();
  // Vietlott draw days:
  // Mega 6/45: Wednesday (3), Friday (5), Sunday (0)
  // Power 6/55: Tuesday (2), Thursday (4), Saturday (6)
  const validDays = gameCode === "power_6_55" ? [2, 4, 6] : [0, 3, 5];

  let target = new Date(now);
  target.setHours(18, 0, 0, 0);

  const isTodayValid = validDays.includes(now.getDay());
  const isPastTodayDraw =
    now.getHours() > 18 || (now.getHours() === 18 && now.getMinutes() >= 30);

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
  const isLive = diffMs <= 0 && diffMs >= -30 * 60 * 1000;

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
    try {
      const pNum = parseInt(currentDrawPeriod.replace(/\D/g, ""), 10);
      if (!isNaN(pNum)) {
        nextPeriodStr = `#${(pNum + 1).toString().padStart(5, "0")}`;
      }
    } catch {
      nextPeriodStr = "";
    }
  }

  return {
    targetDateStr,
    targetDayOfWeek,
    nextPeriodStr,
    days,
    hours,
    minutes,
    seconds,
    isLive
  };
}
