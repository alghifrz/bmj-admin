import type { Metadata } from "next";

import { DashboardHome } from "@/components/admin/dashboard-home";
import content from "@/data/content.json";

const copy = content.dashboard;

export const metadata: Metadata = {
  title: {
    absolute: copy.metaTitle,
  },
};

export default function DashboardPage() {
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .replace(".", ":");

  return <DashboardHome greeting={greetingNow()} updatedAt={`${copy.updatedToday}, ${time} WIB`} />;
}

function greetingNow() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );

  if (hour < 11) return copy.greetingMorning;
  if (hour < 15) return copy.greetingAfternoon;
  if (hour < 18) return copy.greetingEvening;
  return copy.greetingNight;
}
