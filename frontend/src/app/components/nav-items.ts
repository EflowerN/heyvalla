export const navItems = [
  { href: "/", label: "Planner", short: "Plan", icon: "plan" },
  { href: "/journeys", label: "My itineraries", short: "Trips", icon: "trips" },
  { href: "/sailings", label: "Sailings", short: "Sailings", icon: "sailings" },
  { href: "/greater-male-taxi", label: "Taxi fares", short: "Taxi", icon: "taxi" },
  { href: "/buses", label: "RTL buses", short: "Bus", icon: "bus" },
  { href: "/providers", label: "Boat owners", short: "Owners", icon: "owners" },
] as const;

export function activeNavIndex(pathname: string) {
  const index = navItems.findIndex(item => item.href === "/" ? pathname === "/" || pathname === "/ferry-planner" : pathname.startsWith(item.href));
  return Math.max(0, index);
}
