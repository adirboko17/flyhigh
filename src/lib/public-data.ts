import { unstable_cache } from "next/cache";
import {
  HOME_FEATURED_SETTING_KEY,
  parseFeaturedClassIds,
} from "@/lib/home/featuredClasses";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicClass, PublicClassSlot, PoolPass, Program, PrivateLesson } from "@/types";

const PUBLIC_DATA_REVALIDATE_SECONDS = 60;

export const getPublicClasses = unstable_cache(
  async (): Promise<PublicClass[]> => {
    const supabase = createPublicClient();
    const [{ data, error }, { data: slotRows, error: slotsError }] =
      await Promise.all([
        supabase.rpc("list_public_classes"),
        supabase.rpc("list_public_weekly_slots"),
      ]);

    if (error) throw error;
    if (slotsError) throw slotsError;

    const genderResult = await supabase.rpc(
      "list_public_class_instructor_genders"
    );
    const genderRows = genderResult.error ? [] : genderResult.data ?? [];

    const slotsByClass = new Map<string, PublicClass["weekly_slots"]>();
    for (const slot of slotRows ?? []) {
      const list = slotsByClass.get(slot.class_id) ?? [];
      list.push({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        gender_policy: slot.gender_policy,
        note: slot.note,
      });
      slotsByClass.set(slot.class_id, list);
    }

    const genderByClass = new Map<string, PublicClass["instructor_gender"]>();
    for (const row of genderRows ?? []) {
      genderByClass.set(row.class_id, row.gender ?? null);
    }

    return ((data as Omit<PublicClass, "weekly_slots" | "instructor_gender">[]) ?? []).map((cls) => ({
      ...cls,
      weekly_slots: slotsByClass.get(cls.id) ?? [],
      instructor_gender: genderByClass.get(cls.id) ?? null,
    }));
  },
  ["public-classes-v5"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-classes"],
  }
);

export const getHomeFeaturedClassIds = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", HOME_FEATURED_SETTING_KEY)
      .maybeSingle();

    if (error) return [];
    return parseFeaturedClassIds(data?.value);
  },
  ["home-featured-classes-v1"],
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
  ["public-plans-v2"],
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
  ["public-class-slots-v4"],
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
  ["public-class-sessions-v2"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-class-sessions"],
  }
);
