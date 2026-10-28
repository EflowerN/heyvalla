import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return { distDir: process.env.NEXT_BUILD_DIR ?? (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next") };
}
