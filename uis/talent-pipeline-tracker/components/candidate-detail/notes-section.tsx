"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidateNote } from "@/types/candidate-detail";
import { dateLabel } from "./date-label";
import { SectionCard } from "./section-card";

type NotesSectionProps = {
  recordId: string;
};

const API_BASE_URL = "https://playground.4geeks.com/tracker/api/v1";

function parseNotes(payload: unknown): CandidateNote[] {
  if (Array.isArray(payload)) return payload as CandidateNote[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as CandidateNote[];
  }
  return [];
}

export function NotesSection({ recordId }: NotesSectionProps) {
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return submitting || !content.trim();
  }, [content, submitting]);

  const refreshNotes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/records/${recordId}/notes`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No se pudieron obtener las notas");
      }

      const payload = (await response.json()) as unknown;
      setNotes(parseNotes(payload));
      setError("");
    } catch {
      setError("No se pudieron cargar las notas.");
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadNotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/records/${recordId}/notes`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudieron obtener las notas");
        }

        const payload = (await response.json()) as unknown;
        if (!ignore) {
          setNotes(parseNotes(payload));
          setError("");
        }
      } catch {
        if (!ignore) {
          setError("No se pudieron cargar las notas.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadNotes();
    return () => {
      ignore = true;
    };
  }, [recordId]);

  const onAddNote = async () => {
    const value = content.trim();
    if (!value || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/records/${recordId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: value }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear la nota");
      }

      setContent("");
      await refreshNotes();
    } catch {
      setError("No se pudo agregar la nota. Intenta otra vez.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteNote = async (noteId: string) => {
    if (!noteId || deletingId) return;

    setDeletingId(noteId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/records/${recordId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar la nota");
      }

      await refreshNotes();
    } catch {
      setError("No se pudo eliminar la nota. Intenta otra vez.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SectionCard
      title="Notes"
      icon={<span>☰</span>}
      rightSlot={<span className="text-xs text-[var(--text-soft)]">{notes.length} nota(s)</span>}
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--border-muted)] bg-[var(--surface-chip)] p-3">
          <label htmlFor="new-note" className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">
            Nueva nota
          </label>
          <textarea
            id="new-note"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            placeholder="Escribe una observación relevante..."
            className="w-full resize-y rounded-md border border-[var(--border-strong)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => void onAddNote()}
              disabled={isSubmitDisabled}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-[var(--foreground)] transition hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Agregar nota"}
            </button>
          </div>
        </div>

        {loading && (
          <p className="rounded-lg border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
            Cargando notas...
          </p>
        )}

        {error && <p className="text-sm text-[var(--text-soft)]">{error}</p>}

        {notes.map((note) => (
          <article key={note.id} className="rounded-lg border border-[var(--border-muted)] bg-[var(--surface-chip)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-[var(--tag-bg)] px-2 py-1 text-xs text-[var(--text-soft)]">HR</span>
              <span className="font-semibold text-[var(--foreground)]">Recruiter</span>
              <span className="text-xs text-[var(--text-muted)]">{dateLabel(note.created_at)}</span>
            </div>
            <p className="text-base leading-relaxed text-[var(--text-muted)]">{note.content}</p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void onDeleteNote(String(note.id))}
                disabled={deletingId !== null}
                className="rounded-md border border-[var(--border-strong)] px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === String(note.id) ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </article>
        ))}

        {!loading && !notes.length && (
          <p className="rounded-lg border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
            Sin notas registradas para esta candidatura.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
