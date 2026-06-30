"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";

export function AddChildForm({ parentId }: { parentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", birth: "", gender: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("children").insert({
      parent_id: parentId,
      full_name: form.name,
      birth_date: form.birth || null,
      gender: (form.gender || null) as "male" | "female" | "other" | null,
    });
    setForm({ name: "", birth: "", gender: "" });
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ הוספת ילד</Button>;
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:grid-cols-2"
    >
      <Field label="שם מלא" required className="sm:col-span-2">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </Field>
      <Field label="תאריך לידה">
        <Input
          type="date"
          value={form.birth}
          onChange={(e) => setForm({ ...form, birth: e.target.value })}
        />
      </Field>
      <Field label="מין">
        <Select
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
        >
          <option value="">בחרו...</option>
          <option value="male">זכר</option>
          <option value="female">נקבה</option>
          <option value="other">אחר</option>
        </Select>
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "שומר..." : "שמירה"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
