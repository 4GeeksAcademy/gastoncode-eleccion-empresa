"use client";

export function LoadingState({ label }: { label: string }) {
  return <div className="card centered" role="status"><span className="spinner" aria-hidden="true" /><span>{label}</span></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="card centered"><p className="notice noticeError" role="alert">{message}</p><button type="button" onClick={onRetry}>Reintentar</button></div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="card centered" role="status"><h2>{title}</h2><p className="muted">{message}</p></div>;
}
