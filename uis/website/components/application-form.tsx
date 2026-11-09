"use client";

import { useRef, useState, type FormEvent } from "react";
import { FieldError, SelectInput, TextareaInput, TextInput } from "@/components/form-field";

type ApplicationValues = {
  nombre: string;
  email: string;
  telefono: string;
  pais: string;
  ciudad: string;
  interes: string;
  area: string;
  mensaje: string;
  consentimiento: boolean;
};

type FormErrors = Partial<Record<keyof ApplicationValues, string>>;
type Alert = { type: "success" | "error"; message: string } | null;

const initialValues: ApplicationValues = {
  nombre: "",
  email: "",
  telefono: "",
  pais: "",
  ciudad: "",
  interes: "",
  area: "",
  mensaje: "",
  consentimiento: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^\+?[0-9\s-]{8,20}$/;

function validate(values: ApplicationValues): FormErrors {
  const errors: FormErrors = {};
  const nombre = values.nombre.trim();
  const email = values.email.trim();
  const telefono = values.telefono.trim();
  const ciudad = values.ciudad.trim();
  const mensaje = values.mensaje.trim();

  if (!nombre) errors.nombre = "El nombre completo es obligatorio.";
  else if (nombre.length < 3) errors.nombre = "El nombre debe tener al menos 3 caracteres.";

  if (!email) errors.email = "El correo electrónico es obligatorio.";
  else if (!emailRegex.test(email)) errors.email = "Ingresa un correo electrónico válido.";

  if (!telefono) errors.telefono = "El teléfono es obligatorio.";
  else if (!phoneRegex.test(telefono)) errors.telefono = "Ingresa un teléfono válido con código de país.";

  if (!values.pais) errors.pais = "Selecciona un país.";
  if (!ciudad) errors.ciudad = "La ciudad es obligatoria.";
  else if (ciudad.length < 2) errors.ciudad = "La ciudad debe tener al menos 2 caracteres.";
  if (!values.interes) errors.interes = "Selecciona el tipo de información que deseas.";
  if (!values.area) errors.area = "Selecciona un área de interés.";
  if (!mensaje) errors.mensaje = "Este campo es obligatorio.";
  else if (mensaje.length < 20) errors.mensaje = "Escribe al menos 20 caracteres para poder ayudarte mejor.";
  if (!values.consentimiento) errors.consentimiento = "Debes aceptar el consentimiento para continuar.";

  return errors;
}

export function ApplicationForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [alert, setAlert] = useState<Alert>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  function updateField<K extends keyof ApplicationValues>(name: K, value: ApplicationValues[K]) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      const nextValues = { ...values, [name]: value };
      setErrors((current) => ({ ...current, [name]: validate(nextValues)[name] }));
    }
  }

  function handleBlur<K extends Exclude<keyof ApplicationValues, "consentimiento">>(
    name: K,
    value: ApplicationValues[K],
  ) {
    const nextErrors = validate({ ...values, [name]: value });
    setErrors((current) => ({ ...current, [name]: nextErrors[name] }));
  }

  function handleSelectChange<K extends "pais" | "interes" | "area">(name: K, value: ApplicationValues[K]) {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    setErrors((current) => ({ ...current, [name]: validate(nextValues)[name] }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setAlert({ type: "error", message: "Revisa los campos marcados antes de enviar la aplicación." });
      requestAnimationFrame(() => {
        alertRef.current?.focus();
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    setAlert({ type: "success", message: "Recibimos tu solicitud correctamente. Nos pondremos en contacto contigo pronto." });
    setValues(initialValues);
    setErrors({});
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  function handleReset() {
    setValues(initialValues);
    setErrors({});
    setAlert(null);
  }

  const input = (name: Exclude<keyof ApplicationValues, "consentimiento">) => ({
    value: values[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (name === "pais" || name === "interes" || name === "area") {
        handleSelectChange(name, event.currentTarget.value);
      } else {
        updateField(name, event.currentTarget.value);
      }
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      handleBlur(name, event.currentTarget.value),
    invalid: Boolean(errors[name]),
    "aria-describedby": `${name}-error`,
  });

  return (
    <>
      {alert && (
        <div
          ref={alertRef}
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${alert.type === "success" ? "border-emerald-400/60 bg-emerald-900/30 text-emerald-200" : "border-red-400/60 bg-red-900/30 text-red-200"}`}
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          {alert.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-label="Formulario de contacto para clientes interesados" noValidate>
        <div>
          <label htmlFor="nombre" className="mb-2 block text-sm font-semibold">Nombre completo *</label>
          <TextInput id="nombre" name="nombre" type="text" required {...input("nombre")} />
          <FieldError id="nombre-error" message={errors.nombre ?? ""} />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold">Correo electrónico *</label>
          <TextInput id="email" name="email" type="email" required {...input("email")} />
          <FieldError id="email-error" message={errors.email ?? ""} />
        </div>

        <div>
          <label htmlFor="telefono" className="mb-2 block text-sm font-semibold">Teléfono con código de país *</label>
          <TextInput id="telefono" name="telefono" type="tel" required placeholder="+57 3001234567" {...input("telefono")} />
          <FieldError id="telefono-error" message={errors.telefono ?? ""} />
        </div>

        <div>
          <label htmlFor="pais" className="mb-2 block text-sm font-semibold">País *</label>
          <SelectInput id="pais" name="pais" required {...input("pais")}>
            <option value="">Selecciona una opción</option>
            <option value="Colombia">Colombia</option>
            <option value="Estados Unidos">Estados Unidos</option>
            <option value="Otro">Otro</option>
          </SelectInput>
          <FieldError id="pais-error" message={errors.pais ?? ""} />
        </div>

        <div>
          <label htmlFor="ciudad" className="mb-2 block text-sm font-semibold">Ciudad *</label>
          <TextInput id="ciudad" name="ciudad" type="text" required {...input("ciudad")} />
          <FieldError id="ciudad-error" message={errors.ciudad ?? ""} />
        </div>

        <div>
          <label htmlFor="interes" className="mb-2 block text-sm font-semibold">Me interesa recibir *</label>
          <SelectInput id="interes" name="interes" required {...input("interes")}>
            <option value="">Selecciona una opción</option>
            <option value="novedades">Novedades de la marca</option>
            <option value="ofertas">Ofertas y promociones</option>
            <option value="alianzas">Alianzas y oportunidades comerciales</option>
          </SelectInput>
          <FieldError id="interes-error" message={errors.interes ?? ""} />
        </div>

        <div>
          <label htmlFor="area" className="mb-2 block text-sm font-semibold">Área de interés dentro de Brasaland *</label>
          <SelectInput id="area" name="area" required {...input("area")}>
            <option value="">Selecciona una opción</option>
            <option value="operaciones">Operaciones de restaurante</option>
            <option value="compras">Compras y proveedores</option>
            <option value="marketing">Marketing y experiencia digital</option>
            <option value="rrhh">Personas y cultura</option>
            <option value="calidad">Formación y estándares de calidad</option>
            <option value="tecnologia">Tecnología</option>
          </SelectInput>
          <FieldError id="area-error" message={errors.area ?? ""} />
        </div>

        <div>
          <label htmlFor="mensaje" className="mb-2 block text-sm font-semibold">¿Qué te gustaría conocer de Brasaland? *</label>
          <TextareaInput
            id="mensaje"
            name="mensaje"
            rows={4}
            required
            placeholder="Cuéntanos brevemente qué información necesitas."
            {...input("mensaje")}
          />
          <FieldError id="mensaje-error" message={errors.mensaje ?? ""} />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-stone-700 bg-stone-950/60 p-4">
          <input
            id="consentimiento"
            name="consentimiento"
            type="checkbox"
            checked={values.consentimiento}
            onChange={(event) => {
              const value = event.currentTarget.checked;
              const nextValues = { ...values, consentimiento: value };
              setValues(nextValues);
              setErrors((current) => ({ ...current, consentimiento: validate(nextValues).consentimiento }));
            }}
            className={`mt-1 h-4 w-4 rounded border-stone-500 bg-stone-900 text-amber-400 focus:ring-amber-300 ${errors.consentimiento ? "border-red-400" : ""}`}
            aria-invalid={Boolean(errors.consentimiento)}
            aria-describedby="consentimiento-error"
          />
          <label htmlFor="consentimiento" className="text-sm text-stone-200">
            Acepto ser contactado por Brasaland para recibir información sobre ofertas y novedades. *
          </label>
        </div>
        <FieldError id="consentimiento-error" message={errors.consentimiento ?? ""} />

        <button
          type="submit"
          className="w-full rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-stone-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
        >
          Enviar aplicación
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="mt-3 w-full rounded-full border border-stone-500 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition hover:border-amber-300 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
        >
          Borrar selección
        </button>
      </form>
    </>
  );
}
