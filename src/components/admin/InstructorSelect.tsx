import { Select } from "@/components/ui/Input";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";

export function instructorOptionLabel(instructor: ClassInstructorOption) {
  return instructor.isSelf
    ? `${instructor.full_name} (אני · מנהל)`
    : instructor.full_name;
}

export function InstructorSelect({
  value,
  onChange,
  instructors,
  disabled,
}: {
  value: string;
  onChange: (instructorId: string) => void;
  instructors: ClassInstructorOption[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="">ללא שיוך</option>
      {instructors.map((instructor) => (
        <option key={instructor.id} value={instructor.id}>
          {instructorOptionLabel(instructor)}
        </option>
      ))}
    </Select>
  );
}
