const paths: Record<string, string> = {
  plan: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
  trips: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  sailings: '<path d="M2 18l2 3h16l2-3z"/><path d="M5 18v-6h14v6M12 12V4l6 5"/>',
  taxi: '<path d="M3 17v-4l2-6h14l2 6v4zM3 13h18"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
  bus: '<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 17v3M16 17v3"/>',
  owners: '<circle cx="12" cy="5" r="3"/><path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3"/>',
};

export default function NavIcon({ name, className = "h-6 w-6" }: { name: keyof typeof paths; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths[name] }} />;
}
