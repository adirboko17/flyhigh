"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { isGenderType, MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { currentSchoolYear, parseSchoolGradeInput } from "@/lib/school-grade";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import type { Enums } from "@/types/database.types";

export type CustomerActionResult =
  | { success: true }
  | { success: false; error: string };

export type CustomerChildInput = {
  id?: string;
  fullName: string;
  birthDate: string;
  gender: string;
  grade: string;
  notes: string;
};

export type CustomerProfileInput = {
  fullName: string;
  phone: string;
  birthDate: string;
  gender: string;
  city: string;
  address: string;
  receiptName: string;
  receiptIdNumber: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdminCaller() {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "אין לך הרשאה לבצע פעולה זו." };
  }
  return { ok: true as const, profile };
}

function requireAdminClient() {
  if (!isAdminClientConfigured()) {
    return {
      ok: false as const,
      error:
        "ניהול לקוחות אינו מוגדר בשרת. יש להוסיף את SUPABASE_SERVICE_ROLE_KEY לקובץ ‎.env ולהפעיל מחדש.",
    };
  }
  return { ok: true as const, admin: createAdminClient() };
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function validateBirthDate(value: string, required: boolean): string | null {
  if (!value) return required ? "נא למלא תאריך לידה." : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "תאריך הלידה אינו תקין.";
  if (value > todayIso()) return "תאריך הלידה לא יכול להיות בעתיד.";
  if (Number(value.slice(0, 4)) < 1900) return "תאריך הלידה אינו תקין.";
  return null;
}

function normalizeProfile(input: CustomerProfileInput) {
  return {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    birthDate: input.birthDate.trim(),
    gender: input.gender,
    city: input.city.trim(),
    address: input.address.trim(),
    receiptName: input.receiptName.trim(),
    receiptIdNumber: input.receiptIdNumber.trim(),
  };
}

function validateProfile(input: CustomerProfileInput): string | null {
  const profile = normalizeProfile(input);
  if (!profile.fullName) return "יש להזין שם מלא.";
  if (!profile.phone) return "נא למלא מספר טלפון.";
  const birthError = validateBirthDate(profile.birthDate, true);
  if (birthError) return birthError;
  if (!isGenderType(profile.gender)) return "נא לבחור מגדר.";
  if (!profile.city) return "נא למלא עיר.";
  if (!profile.address) return "נא למלא כתובת.";
  return null;
}

function validateEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(email)) return "כתובת המייל אינה תקינה.";
  return null;
}

function validatePassword(password: string, required: boolean): string | null {
  if (!password) return required ? "יש להזין סיסמה." : null;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`;
  }
  return null;
}

function normalizeChildren(children: CustomerChildInput[]) {
  return children
    .map((child) => ({
      id: child.id?.trim() || undefined,
      fullName: child.fullName.trim(),
      birthDate: child.birthDate.trim(),
      gender: child.gender,
      grade: child.grade,
      notes: child.notes.trim(),
    }))
    .filter((child) => child.fullName || child.birthDate || child.gender || child.grade || child.notes);
}

function validateChildren(children: CustomerChildInput[]): string | null {
  for (const [index, child] of normalizeChildren(children).entries()) {
    const label = child.fullName || `ילד/ה ${index + 1}`;
    if (!child.fullName) return `נא למלא שם ל${label}.`;
    if (!isGenderType(child.gender)) return `נא לבחור מגדר עבור ${label}.`;
    if (parseSchoolGradeInput(child.grade) === null) {
      return `נא לבחור כיתה עבור ${label}.`;
    }
    const birthError = validateBirthDate(child.birthDate, false);
    if (birthError) return `${label}: ${birthError}`;
  }
  return null;
}

function profileRow(input: CustomerProfileInput, email: string) {
  const profile = normalizeProfile(input);
  return {
    full_name: profile.fullName,
    email,
    phone: profile.phone,
    birth_date: profile.birthDate,
    gender: profile.gender as Enums<"gender_type">,
    city: profile.city,
    address: profile.address,
    receipt_name: profile.receiptName || null,
    receipt_id_number: profile.receiptIdNumber || null,
  };
}

function childRow(child: ReturnType<typeof normalizeChildren>[number]) {
  return {
    full_name: child.fullName,
    birth_date: child.birthDate || null,
    gender: child.gender as Enums<"gender_type">,
    school_grade: parseSchoolGradeInput(child.grade),
    grade_school_year: currentSchoolYear(),
    notes: child.notes || null,
  };
}

async function childHasBlockingLinks(
  admin: ReturnType<typeof createAdminClient>,
  childId: string
) {
  const [enrollments, waitlist, slots] = await Promise.all([
    admin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId),
    admin
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId),
    admin
      .from("private_lesson_slots")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId),
  ]);

  return (
    (enrollments.count ?? 0) > 0 ||
    (waitlist.count ?? 0) > 0 ||
    (slots.count ?? 0) > 0
  );
}

function refreshCustomerPaths(profileId?: string) {
  revalidatePath("/admin/customers");
  revalidatePath("/admin");
  if (profileId) revalidateTag(`profile:${profileId}`);
}

export async function createCustomer(input: {
  profile: CustomerProfileInput;
  email: string;
  password: string;
  children: CustomerChildInput[];
}): Promise<CustomerActionResult> {
  const caller = await requireAdminCaller();
  if (!caller.ok) return { success: false, error: caller.error };

  const client = requireAdminClient();
  if (!client.ok) return { success: false, error: client.error };

  const email = input.email.trim().toLowerCase();
  const profileError = validateProfile(input.profile);
  if (profileError) return { success: false, error: profileError };
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };
  const passwordError = validatePassword(input.password, true);
  if (passwordError) return { success: false, error: passwordError };
  const childrenError = validateChildren(input.children);
  if (childrenError) return { success: false, error: childrenError };

  const profile = normalizeProfile(input.profile);
  const children = normalizeChildren(input.children);
  const admin = client.admin;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: profile.fullName,
      phone: profile.phone,
      birth_date: profile.birthDate,
      gender: profile.gender,
      city: profile.city,
      address: profile.address,
      receipt_name: profile.receiptName || null,
      receipt_id_number: profile.receiptIdNumber || null,
    },
  });

  if (error || !data.user) {
    const alreadyExists =
      error?.status === 422 ||
      /already|exists|registered/i.test(error?.message ?? "");
    return {
      success: false,
      error: alreadyExists
        ? "כתובת המייל כבר רשומה במערכת."
        : "יצירת הלקוח נכשלה. נסו שוב.",
    };
  }

  const userId = data.user.id;

  const { error: profileErrorDb } = await admin
    .from("profiles")
    .update({
      ...profileRow(input.profile, email),
      role: "parent",
    })
    .eq("id", userId);

  if (profileErrorDb) {
    await admin.auth.admin.deleteUser(userId);
    return { success: false, error: "יצירת הלקוח נכשלה. נסו שוב." };
  }

  if (children.length > 0) {
    const { error: childrenErrorDb } = await admin.from("children").insert(
      children.map((child) => ({
        parent_id: userId,
        ...childRow(child),
      }))
    );

    if (childrenErrorDb) {
      await admin.auth.admin.deleteUser(userId);
      return { success: false, error: "שמירת הילדים נכשלה. נסו שוב." };
    }
  }

  refreshCustomerPaths(userId);
  return { success: true };
}

export async function updateCustomer(input: {
  profileId: string;
  profile: CustomerProfileInput;
  email: string;
  password?: string;
  children: CustomerChildInput[];
}): Promise<CustomerActionResult> {
  const caller = await requireAdminCaller();
  if (!caller.ok) return { success: false, error: caller.error };

  const client = requireAdminClient();
  if (!client.ok) return { success: false, error: client.error };

  const email = input.email.trim().toLowerCase();
  const profileError = validateProfile(input.profile);
  if (profileError) return { success: false, error: profileError };
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };
  const passwordError = validatePassword(input.password ?? "", false);
  if (passwordError) return { success: false, error: passwordError };
  const childrenError = validateChildren(input.children);
  if (childrenError) return { success: false, error: childrenError };

  const admin = client.admin;
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", input.profileId)
    .maybeSingle();

  if (!target || target.role !== "parent") {
    return { success: false, error: "הלקוח לא נמצא." };
  }

  const children = normalizeChildren(input.children);
  const incomingIds = children
    .map((child) => child.id)
    .filter((id): id is string => Boolean(id));

  if (incomingIds.length > 0) {
    const { data: owned } = await admin
      .from("children")
      .select("id")
      .eq("parent_id", target.id)
      .in("id", incomingIds);

    if ((owned ?? []).length !== incomingIds.length) {
      return { success: false, error: "לא ניתן לערוך ילד שאינו שייך ללקוח." };
    }
  }

  const { data: existingChildren } = await admin
    .from("children")
    .select("id, full_name")
    .eq("parent_id", target.id);

  const keepIds = new Set(incomingIds);
  for (const existing of existingChildren ?? []) {
    if (keepIds.has(existing.id)) continue;
    if (await childHasBlockingLinks(admin, existing.id)) {
      return {
        success: false,
        error: `לא ניתן להסיר את ${existing.full_name} כי קיימת הרשמה, רשימת המתנה או שיעור פרטי.`,
      };
    }
    const { error: deleteChildError } = await admin
      .from("children")
      .delete()
      .eq("id", existing.id)
      .eq("parent_id", target.id);
    if (deleteChildError) {
      return { success: false, error: `הסרת ${existing.full_name} נכשלה.` };
    }
  }

  for (const child of children) {
    const row = childRow(child);
    if (child.id) {
      const { error } = await admin
        .from("children")
        .update(row)
        .eq("id", child.id)
        .eq("parent_id", target.id);
      if (error) {
        return { success: false, error: `עדכון ${child.fullName} נכשל.` };
      }
    } else {
      const { error } = await admin.from("children").insert({
        parent_id: target.id,
        ...row,
      });
      if (error) {
        return { success: false, error: `הוספת ${child.fullName} נכשלה.` };
      }
    }
  }

  const authUpdate: { email?: string; password?: string; email_confirm?: true } =
    {};
  if (email !== (target.email ?? "").toLowerCase()) {
    authUpdate.email = email;
    authUpdate.email_confirm = true;
  }
  if (input.password) {
    authUpdate.password = input.password;
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(
      target.id,
      authUpdate
    );
    if (authError) {
      const alreadyExists =
        authError.status === 422 ||
        /already|exists|registered/i.test(authError.message);
      return {
        success: false,
        error: alreadyExists
          ? "כתובת המייל כבר רשומה במערכת."
          : "עדכון פרטי ההתחברות נכשל. נסו שוב.",
      };
    }
  }

  const { error: profileErrorDb } = await admin
    .from("profiles")
    .update(profileRow(input.profile, email))
    .eq("id", target.id)
    .eq("role", "parent");

  if (profileErrorDb) {
    return { success: false, error: "עדכון פרטי הלקוח נכשל. נסו שוב." };
  }

  refreshCustomerPaths(target.id);
  return { success: true };
}

export async function deleteCustomer(input: {
  profileId: string;
}): Promise<CustomerActionResult> {
  const caller = await requireAdminCaller();
  if (!caller.ok) return { success: false, error: caller.error };

  const client = requireAdminClient();
  if (!client.ok) return { success: false, error: client.error };

  const admin = client.admin;
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", input.profileId)
    .maybeSingle();

  if (!target || target.role !== "parent") {
    return { success: false, error: "הלקוח לא נמצא." };
  }

  const { error: slotsError } = await admin
    .from("private_lesson_slots")
    .delete()
    .eq("parent_id", target.id);

  if (slotsError) {
    return {
      success: false,
      error: "לא ניתן למחוק את הלקוח כי נותרו שיעורים פרטיים מקושרים.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(target.id);
  if (error) {
    return { success: false, error: "מחיקת הלקוח נכשלה. נסו שוב." };
  }

  refreshCustomerPaths(target.id);
  return { success: true };
}
