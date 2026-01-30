import { DayOfWeek } from "../generated/prisma/client.js";
export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay(); 

  const map: Record<number, DayOfWeek> = {
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
  };


  if (jsDay === 0) {
    throw new Error("No lectures on Sunday");
  }

  return map[jsDay];
}