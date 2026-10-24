"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

export default function SlideSwitch({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);
  const activeIndex = Math.max(0, options.findIndex(option => option.value === value));

  useLayoutEffect(() => {
    const measure = () => {
      const button = buttons.current[activeIndex];
      if (button) setBox({ left: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [activeIndex]);
  useEffect(() => { const id = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(id); }, []);

  return (
    <div ref={root} role="group" aria-label={label} className="relative inline-flex rounded-full border border-ocean/15 bg-sand p-1">
      <span
        aria-hidden="true"
        className={`absolute bottom-1 top-1 rounded-full bg-lagoon ${animate ? "transition-[left,width] duration-300 ease-out" : ""}`}
        style={{ left: box?.left ?? 0, width: box?.width ?? 0, opacity: box ? 1 : 0 }}
      />
      {options.map((option, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={option.value}
            type="button"
            ref={element => { buttons.current[index] = element; }}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`tap relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-300 ${active ? "text-white" : "text-ocean hover:text-lagoon"} ${active && !box ? "bg-lagoon" : ""}`}
          >{option.label}</button>
        );
      })}
    </div>
  );
}
