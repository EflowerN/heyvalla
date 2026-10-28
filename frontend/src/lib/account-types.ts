export type AccountType = "customer" | "vessel_owner" | "vehicle_owner" | "business";
export type AccountStatus = "active" | "pending" | "suspended";
export type AccountInfo = { name: string | null; email: string; type: AccountType; status: AccountStatus; is_admin: boolean; organization_name: string | null };

export const ACCOUNT_TYPES: { value: AccountType; label: string; blurb: string; organisation?: string }[] = [
  { value: "customer", label: "Traveller", blurb: "Plan and book trips for yourself. Ready straight away." },
  { value: "vessel_owner", label: "Boat owner", blurb: "Publish sailings and approve seat requests. Our team approves new boat owners first.", organisation: "Boat or company name" },
  { value: "vehicle_owner", label: "Vehicle owner", blurb: "Taxi, bus or transfer operator. Our team approves new operators first.", organisation: "Taxi, bus or company name" },
  { value: "business", label: "Business", blurb: "Resorts, guesthouses and travel agencies booking for guests. Our team approves new businesses first.", organisation: "Business name" },
];

export const needsApproval = (type: AccountType) => type !== "customer";

/** Where to send someone right after they sign up or sign in. */
export function nextPage(account: AccountInfo): string {
  if (account.status !== "active") return "/account";
  if (account.type === "vessel_owner") return "/providers";
  if (account.type === "customer") return "/journeys";
  return "/account";
}

export const canUseBoatTools = (account: AccountInfo | null) => !!account && account.type === "vessel_owner" && account.status === "active";
export const isAdmin = (account: AccountInfo | null) => !!account && account.is_admin && account.status === "active";
