import { createServerFn } from "@tanstack/react-start";
import { fetchPercipioReport } from "./percipio.server";
import type { TrainingRecord } from "@/lib/training-types";

export const syncPercipio = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ records: TrainingRecord[]; error: string | null }> => {
    try {
      const records = await fetchPercipioReport();
      return { records, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Percipio sync failed:", msg);
      return { records: [], error: msg };
    }
  },
);
