import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicClass, PublicClassSlot, PoolPass, Program, PrivateLesson } from "@/types";

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
  async (): Promise<{
    programs: Program[];
    poolPasses: PoolPass[];
    privateLessons: PrivateLesson[];
  }> => {
    const supabase = createPublicClient();
    const [
      { data: programs, error: programsError },
      { data: poolPasses, error: passesError },
      { data: privateLessons, error: lessonsError },
    ] = await Promise.all([
      supabase
        .from("programs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase
        .from("pool_passes")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase
        .from("private_lessons")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

    if (programsError) throw programsError;
    if (passesError) throw passesError;
    if (lessonsError) throw lessonsError;

    return {
      programs: programs ?? [],
      poolPasses: poolPasses ?? [],
      privateLessons: privateLessons ?? [],
    };
  },
  ["public-plans"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-plans"],
  }
);

export const getPublicClassSlots = unstable_cache(
  async (classId: string): Promise<PublicClassSlot[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("list_public_class_slots", {
      p_class_id: classId,
    });

    if (error) throw error;
    return (data as PublicClassSlot[]) ?? [];
  },
  ["public-class-slots-v2"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-class-slots"],
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
