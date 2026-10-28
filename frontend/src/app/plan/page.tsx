import { Suspense } from "react";
import type { Metadata } from "next";
import JourneyPlanner from "../components/JourneyPlanner";

export const metadata: Metadata = { title: "Plan a trip" };

export default function Plan() {
  return <Suspense fallback={null}><JourneyPlanner /></Suspense>;
}
