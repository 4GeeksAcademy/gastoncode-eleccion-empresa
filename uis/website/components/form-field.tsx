import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldErrorProps = {
  id: string;
  message: string;
};

export function FieldError({ id, message }: FieldErrorProps) {
  return <p id={id} className="mt-1 min-h-5 text-sm text-red-300" role="alert">{message}</p>;
}

type FieldControlProps = {
  invalid: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ invalid, className = "", ...props }: FieldControlProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid}
      className={`w-full rounded-xl border bg-stone-950 px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 ${invalid ? "border-red-400 ring-2 ring-red-300/30" : "border-stone-700"} ${className}`}
    />
  );
}

type SelectControlProps = {
  invalid: boolean;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectInput({ invalid, className = "", ...props }: SelectControlProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid}
      className={`w-full rounded-xl border bg-stone-950 px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 ${invalid ? "border-red-400 ring-2 ring-red-300/30" : "border-stone-700"} ${className}`}
    />
  );
}

type TextareaControlProps = {
  invalid: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaInput({ invalid, className = "", ...props }: TextareaControlProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid}
      className={`w-full rounded-xl border bg-stone-950 px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 ${invalid ? "border-red-400 ring-2 ring-red-300/30" : "border-stone-700"} ${className}`}
    />
  );
}
