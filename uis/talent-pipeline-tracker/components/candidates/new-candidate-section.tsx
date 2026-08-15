"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormValues = {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type Feedback = {
  type: "success" | "error";
  message: string;
};

const API_BASE_URL = "https://playground.4geeks.com/tracker/api/v1";

const INITIAL_VALUES: FormValues = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: "",
};

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!values.full_name.trim()) errors.full_name = "El nombre completo es obligatorio.";
  if (!values.email.trim()) errors.email = "El email es obligatorio.";
  else if (!emailPattern.test(values.email.trim())) errors.email = "Ingresa un email válido.";

  if (!values.phone.trim()) errors.phone = "El teléfono es obligatorio.";
  if (!values.position.trim()) errors.position = "El puesto es obligatorio.";

  if (!values.cv_url.trim()) errors.cv_url = "La URL del CV es obligatoria.";
  else if (!isValidUrl(values.cv_url.trim())) errors.cv_url = "Ingresa una URL de CV válida (http o https).";

  if (values.linkedin_url.trim() && !isValidUrl(values.linkedin_url.trim())) {
    errors.linkedin_url = "Ingresa una URL de LinkedIn válida (http o https).";
  }

  if (!values.experience_years.trim()) {
    errors.experience_years = "La experiencia es obligatoria.";
  } else {
    const years = Number(values.experience_years);
    if (!Number.isFinite(years) || !Number.isInteger(years) || years < 0) {
      errors.experience_years = "Ingresa un número entero mayor o igual a 0.";
    }
  }

  return errors;
}

export function NewCandidateSection() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const onChange = (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);

    if (hasErrors) {
      setErrors(validate(next));
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);

    const payload: {
      full_name: string;
      email: string;
      phone: string;
      position: string;
      cv_url: string;
      experience_years: number;
      linkedin_url?: string;
    } = {
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      position: values.position.trim(),
      cv_url: values.cv_url.trim(),
      experience_years: Number(values.experience_years),
    };

    const linkedin = values.linkedin_url.trim();
    if (linkedin) payload.linkedin_url = linkedin;

    try {
      const response = await fetch(`${API_BASE_URL}/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        setFeedback({
          type: "success",
          message: "Candidatura creada exitosamente.",
        });
        setValues(INITIAL_VALUES);
        setErrors({});
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: `No se pudo crear la candidatura. Código de respuesta: ${response.status}.`,
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "No se pudo crear la candidatura por un error de red. Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FormValues) => {
    const hasError = Boolean(errors[field]);
    return `w-full rounded-md border bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] placeholder:text-[var(--placeholder)] focus:ring-2 ${
      hasError ? "border-red-500" : "border-[var(--border-strong)]"
    }`;
  };

  return (
    <details className="mb-6 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-4">
      <summary className="cursor-pointer list-none text-base font-semibold text-[var(--foreground)]">
        Ingresar nueva candidatura
      </summary>

      <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              name="full_name"
              value={values.full_name}
              onChange={onChange("full_name")}
              placeholder="Nombre completo *"
              className={inputClass("full_name")}
            />
            {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name}</p>}
          </div>

          <div>
            <input
              type="email"
              name="email"
              value={values.email}
              onChange={onChange("email")}
              placeholder="Email *"
              className={inputClass("email")}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <input
              name="phone"
              value={values.phone}
              onChange={onChange("phone")}
              placeholder="Teléfono *"
              className={inputClass("phone")}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
          </div>

          <div>
            <input
              name="position"
              value={values.position}
              onChange={onChange("position")}
              placeholder="Puesto *"
              className={inputClass("position")}
            />
            {errors.position && <p className="mt-1 text-xs text-red-400">{errors.position}</p>}
          </div>

          <div>
            <input
              name="linkedin_url"
              value={values.linkedin_url}
              onChange={onChange("linkedin_url")}
              placeholder="LinkedIn URL (opcional)"
              className={inputClass("linkedin_url")}
            />
            {errors.linkedin_url && <p className="mt-1 text-xs text-red-400">{errors.linkedin_url}</p>}
          </div>

          <div>
            <input
              name="cv_url"
              value={values.cv_url}
              onChange={onChange("cv_url")}
              placeholder="CV URL *"
              className={inputClass("cv_url")}
            />
            {errors.cv_url && <p className="mt-1 text-xs text-red-400">{errors.cv_url}</p>}
          </div>

          <div>
            <input
              type="number"
              name="experience_years"
              min={0}
              step={1}
              value={values.experience_years}
              onChange={onChange("experience_years")}
              placeholder="Años de experiencia *"
              className={inputClass("experience_years")}
            />
            {errors.experience_years && <p className="mt-1 text-xs text-red-400">{errors.experience_years}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">Los campos con * son obligatorios.</p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Guardando..." : "Crear candidatura"}
          </button>
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {feedback.message}
          </p>
        )}
      </form>
    </details>
  );
}
