"use client";

import { ClassCard } from "@/components/classes/ClassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  type ClassAudienceType,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import {
  formToPreviewClass,
  type ClassScheduleState,
} from "@/lib/scheduling/classSchedule";
import type { PublicClass } from "@/types";

export type ClassPreviewForm = {
  title: string;
  description: string;
  category: string;
  level: string;
  gender_policy: ClassGenderPolicy;
  audience_type: ClassAudienceType;
  age_min: string;
  age_max: string;
  age_min_unit?: "years" | "months";
  age_max_unit?: "years" | "months";
  grade_min: string;
  grade_max: string;
  capacity: string;
  capacity_limited?: boolean;
  price: string;
  price_mode?: "period" | "monthly";
  pick_one_slot?: boolean;
  billing_months?: string;
  planned_session_count?: string;
  interest_only?: boolean;
};

export function ClassPreviewPanel({
  form,
  schedule,
  imageUrl,
  instructorName,
  instructorGender = null,
  previewStatus = "active",
}: {
  form: ClassPreviewForm;
  schedule: ClassScheduleState;
  imageUrl: string | null;
  instructorName: string | null;
  instructorGender?: PublicClass["instructor_gender"];
  previewStatus?: PublicClass["status"];
}) {
  const cls = formToPreviewClass(
    form,
    schedule,
    imageUrl,
    instructorName,
    instructorGender,
    previewStatus
  );
  const hasContent = Boolean(form.title.trim() || imageUrl);

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
        <p className="text-sm text-ink-500">כך הכרטיס יופיע בקטלוג החוגים</p>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            מלאו שם חוג והעלו תמונה כדי לראות תצוגה מקדימה
          </p>
        ) : (
          <ClassCard cls={cls} preview />
        )}
      </CardContent>
    </Card>
  );
}
