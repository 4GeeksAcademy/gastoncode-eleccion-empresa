"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  ORIGIN_OPTIONS,
  type IncidentField,
  type IncidentInput,
} from "@/lib/incidents";
import { GENERIC_ERROR, IncidentRequestError, createIncident } from "@/lib/incidents-api";

type FormValues = Record<IncidentField, string>;
type FieldErrors = Partial<Record<IncidentField, string>>;

const EMPTY_VALUES: FormValues = {
  title: "",
  description: "",
  category: "",
  origin: "",
  branch: "",
};

const FIELD_ORDER: readonly IncidentField[] = [
  "title",
  "description",
  "category",
  "origin",
  "branch",
];

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.title.trim()) errors.title = "Escribe un título breve para la incidencia.";
  if (!values.description.trim()) errors.description = "Describe qué ocurrió.";
  if (!values.category) errors.category = "Selecciona una categoría.";
  if (!values.origin) errors.origin = "Indica quién reporta la incidencia.";
  if (!values.branch) {
    errors.branch = "Selecciona la sede que reporta o gestiona la incidencia.";
  } else if (values.origin === "branch" && values.branch === "central") {
    errors.branch = "Si reportas desde una sede, elige la sede concreta en lugar de Central.";
  }
  return errors;
}

function focusFirstError(errors: FieldErrors) {
  const first = FIELD_ORDER.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

export default function IncidentForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  const reportingFromBranch = values.origin === "branch";

  function update(field: IncidentField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSuccess(false);

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      focusFirstError(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createIncident({
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
      } as IncidentInput);
      setValues(EMPTY_VALUES);
      setErrors({});
      setSuccess(true);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (failure) {
      const requestError =
        failure instanceof IncidentRequestError ? failure : new IncidentRequestError(GENERIC_ERROR);
      const fallback = validate(values);
      const serverErrors: FieldErrors = {};
      for (const field of FIELD_ORDER) {
        if (requestError.fieldErrors[field]) {
          serverErrors[field] = fallback[field] ?? "Revisa este valor.";
        }
      }
      setErrors(serverErrors);
      setFormError(requestError.message);
      focusFirstError(serverErrors);
    } finally {
      setSubmitting(false);
    }
  }

  function describedBy(field: IncidentField, hint?: string) {
    return [hint, errors[field] ? `${field}-error` : undefined].filter(Boolean).join(" ") || undefined;
  }

  function fieldError(field: IncidentField) {
    return errors[field] ? (
      <p id={`${field}-error`} className="fieldError">
        {errors[field]}
      </p>
    ) : null;
  }

  return (
    <form className="card incidentForm" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      {success && (
        <div ref={successRef} tabIndex={-1} className="notice noticeSuccess" role="status">
          Incidencia registrada correctamente. Puedes registrar otra cuando quieras.
        </div>
      )}
      {formError && (
        <div className="notice noticeError" role="alert">
          {formError}
        </div>
      )}

      <fieldset className="incidentFields" disabled={submitting}>
      <div className="field">
        <label htmlFor="title">Título *</label>
        <input
          id="title"
          name="title"
          type="text"
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder="Ej.: La freidora no calienta"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title")}
          required
        />
        {fieldError("title")}
      </div>

      <div className="field">
        <label htmlFor="description">Descripción *</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Qué ocurrió, cuándo y a quién afecta"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy("description")}
          required
        />
        {fieldError("description")}
      </div>

      <div className="fieldRow">
        <div className="field">
          <label htmlFor="category">Categoría *</label>
          <select
            id="category"
            name="category"
            value={values.category}
            onChange={(event) => update("category", event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy("category")}
            required
          >
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldError("category")}
        </div>

        <div className="field">
          <label htmlFor="status">Estado</label>
          <input id="status" name="status" type="text" value="Abierta" readOnly aria-describedby="status-hint" />
          <p id="status-hint" className="fieldHint">
            Toda incidencia nueva se registra como abierta.
          </p>
        </div>
      </div>

      <fieldset className="field">
        <legend>Origen del reporte *</legend>
        <div
          className="choiceGroup"
          role="radiogroup"
          aria-invalid={Boolean(errors.origin)}
          aria-describedby={describedBy("origin")}
        >
          {ORIGIN_OPTIONS.map((option, index) => (
            <label key={option.value} className="choice">
              <input
                id={index === 0 ? "origin" : undefined}
                type="radio"
                name="origin"
                value={option.value}
                checked={values.origin === option.value}
                onChange={(event) => update("origin", event.target.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldError("origin")}
      </fieldset>

      <div className={`field${reportingFromBranch ? " fieldHighlighted" : ""}`}>
        <label htmlFor="branch">Sede *</label>
        {reportingFromBranch && (
          <p id="branch-hint" className="fieldHint highlightHint">
            Estás reportando desde una sede: confirma que sea la correcta.
          </p>
        )}
        <select
          id="branch"
          name="branch"
          value={values.branch}
          onChange={(event) => update("branch", event.target.value)}
          aria-invalid={Boolean(errors.branch)}
          aria-describedby={describedBy("branch", reportingFromBranch ? "branch-hint" : undefined)}
          required
        >
          <option value="" disabled>
            Selecciona una sede
          </option>
          {BRANCH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldError("branch")}
      </div>

      <div className="formActions">
        <button type="submit" disabled={submitting}>
          {submitting && <span className="spinner" aria-hidden="true" />}
          {submitting ? "Registrando..." : "Registrar incidencia"}
        </button>
      </div>
      </fieldset>
    </form>
  );
}
