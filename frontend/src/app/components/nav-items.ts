export const navItems = [
  { href: "/plan", label: "Plan a trip", short: "Plan", icon: "plan" },
  { href: "/journeys", label: "My trips", short: "Trips", icon: "trips" },
  { href: "/sailings", label: "Sailings", short: "Sailings", icon: "sailings" },
  { href: "/greater-male-taxi", label: "Taxi fares", short: "Taxi", icon: "taxi" },
  { href: "/buses", label: "RTL buses", short: "Bus", icon: "bus" },
  { href: "/providers", label: "Boat owners", short: "Owners", icon: "owners" },
] as const;

/** Index of the current section, or -1 on the home page and pages outside the main sections. */
export function activeNavIndex(pathname: string) {
  if (pathname === "/ferry-planner") return 0;
  return navItems.findIndex(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
