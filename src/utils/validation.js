const form = document.getElementById('application-form');
const formAlert = document.getElementById('form-alert');

const fields = {
  nombre: {
    element: document.getElementById('nombre'),
    error: document.getElementById('nombre-error'),
    validate: (value) => {
      if (!value.trim()) return 'El nombre completo es obligatorio.';
      if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
      return '';
    }
  },
  email: {
    element: document.getElementById('email'),
    error: document.getElementById('email-error'),
    validate: (value) => {
      if (!value.trim()) return 'El correo electrónico es obligatorio.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(value.trim())) return 'Ingresa un correo electrónico válido.';
      return '';
    }
  },
  telefono: {
    element: document.getElementById('telefono'),
    error: document.getElementById('telefono-error'),
    validate: (value) => {
      if (!value.trim()) return 'El teléfono es obligatorio.';
      const phoneRegex = /^\+?[0-9\s-]{8,20}$/;
      if (!phoneRegex.test(value.trim())) return 'Ingresa un teléfono válido con código de país.';
      return '';
    }
  },
  pais: {
    element: document.getElementById('pais'),
    error: document.getElementById('pais-error'),
    validate: (value) => (!value ? 'Selecciona un país.' : '')
  },
  ciudad: {
    element: document.getElementById('ciudad'),
    error: document.getElementById('ciudad-error'),
    validate: (value) => {
      if (!value.trim()) return 'La ciudad es obligatoria.';
      if (value.trim().length < 2) return 'La ciudad debe tener al menos 2 caracteres.';
      return '';
    }
  },
  interes: {
    element: document.getElementById('interes'),
    error: document.getElementById('interes-error'),
    validate: (value) => (!value ? 'Selecciona el tipo de información que deseas.' : '')
  },
  area: {
    element: document.getElementById('area'),
    error: document.getElementById('area-error'),
    validate: (value) => (!value ? 'Selecciona un área de interés.' : '')
  },
  mensaje: {
    element: document.getElementById('mensaje'),
    error: document.getElementById('mensaje-error'),
    validate: (value) => {
      if (!value.trim()) return 'Este campo es obligatorio.';
      if (value.trim().length < 20) return 'Escribe al menos 20 caracteres para poder ayudarte mejor.';
      return '';
    }
  },
  consentimiento: {
    element: document.getElementById('consentimiento'),
    error: document.getElementById('consentimiento-error'),
    validate: (_, element) => (!element.checked ? 'Debes aceptar el consentimiento para continuar.' : '')
  }
};

function setError(fieldName, message) {
  const field = fields[fieldName];
  field.error.textContent = message;

  if (message) {
    field.element.setAttribute('aria-invalid', 'true');
    field.element.classList.add('border-red-400', 'ring-2', 'ring-red-300/30');
    field.element.classList.remove('border-stone-700');
  } else {
    field.element.setAttribute('aria-invalid', 'false');
    field.element.classList.remove('border-red-400', 'ring-2', 'ring-red-300/30');
    field.element.classList.add('border-stone-700');
  }
}

function validateField(fieldName) {
  const field = fields[fieldName];
  const value = field.element.type === 'checkbox' ? String(field.element.checked) : field.element.value;
  const message = field.validate(value, field.element);
  setError(fieldName, message);
  return !message;
}

function validateAll() {
  let allValid = true;

  Object.keys(fields).forEach((fieldName) => {
    if (!validateField(fieldName)) allValid = false;
  });

  return allValid;
}

function showAlert(message, type) {
  const base = 'mt-6 rounded-xl border px-4 py-3 text-sm';
  const variant =
    type === 'success'
      ? 'border-emerald-400/60 bg-emerald-900/30 text-emerald-200'
      : 'border-red-400/60 bg-red-900/30 text-red-200';

  formAlert.className = `${base} ${variant}`;
  formAlert.textContent = message;
  formAlert.classList.remove('hidden');
  formAlert.focus();
}

Object.keys(fields).forEach((fieldName) => {
  const field = fields[fieldName];
  const eventName = field.element.type === 'checkbox' || field.element.tagName === 'SELECT' ? 'change' : 'blur';

  field.element.addEventListener(eventName, () => {
    validateField(fieldName);
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formAlert.classList.add('hidden');

  if (!validateAll()) {
    showAlert('Revisa los campos marcados antes de enviar la aplicación.', 'error');
    const firstInvalid = Object.values(fields).find((field) => field.element.getAttribute('aria-invalid') === 'true');
    if (firstInvalid) firstInvalid.element.focus();
    return;
  }

  showAlert('Recibimos tu solicitud correctamente. Nos pondremos en contacto contigo pronto.', 'success');
  form.reset();

  Object.keys(fields).forEach((fieldName) => setError(fieldName, ''));
});

// Botón para borrar selección
const resetBtn = document.getElementById('reset-form-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    form.reset();
    formAlert.classList.add('hidden');
    Object.keys(fields).forEach((fieldName) => setError(fieldName, ''));
  });
}
