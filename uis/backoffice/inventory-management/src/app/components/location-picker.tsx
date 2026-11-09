"use client";

const LOCATIONS = Array.from({ length: 14 }, (_, index) => index + 1);

export function LocationPicker({ value, onChange }: { value: number | ""; onChange: (locationId: number | "") => void }) {
  return (
    <div className="field">
      <label htmlFor="location">Sede</label>
      <select id="location" value={value} required onChange={(event) => onChange(event.target.value ? Number(event.target.value) : "")}>
        <option value="">Selecciona una sede</option>
        {LOCATIONS.map((location) => <option key={location} value={location}>Local {location}</option>)}
      </select>
      <p className="fieldHint">Se muestran identificadores neutros porque la API no documenta el mapeo de sedes.</p>
    </div>
  );
}
