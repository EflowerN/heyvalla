import { useT } from "./I18nProvider";
export default function DemoNotice() {
  const t = useT();
  return <aside className="mb-8 rounded-xl border border-coral/50 bg-coral/10 p-4 text-sm leading-6 text-ocean">{t("Demonstration only. All sailings, durations, cancellations, and transfer allowances are fictional. Built-in ferries repeat daily; provider sailings have specific dates. These are not RTL schedules. No real tickets are available.")}</aside>;
}
