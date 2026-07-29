"use client";

import { useRef } from "react";
import { cn } from "@/utils/cn";

const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  function focusAt(index: number) {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }

  function updateDigit(index: number, nextChar: string) {
    const digit = nextChar.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, OTP_LENGTH));
    if (digit && index < OTP_LENGTH - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusAt(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) focusAt(index - 1);
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) focusAt(index + 1);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`ספרה ${index + 1} מתוך ${OTP_LENGTH}`}
          onChange={(e) => updateDigit(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-12 w-11 rounded-xl border bg-white text-center font-display text-xl font-extrabold text-ink-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50 sm:h-14 sm:w-12 sm:text-2xl",
            error ? "border-red-300" : "border-ink-200"
          )}
        />
      ))}
    </div>
  );
}

export const OTP_CODE_LENGTH = OTP_LENGTH;
