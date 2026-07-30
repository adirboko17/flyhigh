import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicClass, PoolPass, Program } from "@/types";

const PUBLIC_DATA_REVALIDATE_SECONDS = 60;

export const getPublicClasses = unstable_cache(
  async (): Promise<PublicClass[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("list_public_classes");

    if (error) throw error;
    return (data as PublicClass[]) ?? [];
  },
  ["public-classes"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-classes"],
  }
);

export const getPublicPlans = unstable_cache(
  async (): Promise<{ programs: Program[]; poolPasses: PoolPass[] }> => {
    const supabase = createPublicClient();
    const [{ data: programs, error: programsError }, { data: poolPasses, error: passesError }] =
      await Promise.all([
        supabase.from("programs").select("*").eq("status", "active"),
        supabase.from("pool_passes").select("*").eq("status", "active"),
      ]);

    if (programsError) throw programsError;
    if (passesError) throw passesError;

    return {
      programs: programs ?? [],
      poolPasses: poolPasses ?? [],
    };
  },
  ["public-plans"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-plans"],
  }
);

export const getPublicClassSessions = unstable_cache(
  async (classId: string) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("list_public_class_sessions", {
      p_class_id: classId,
    });

    if (error) throw error;
    return data ?? [];
  },
  ["public-class-sessions"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-class-sessions"],
  }
);
