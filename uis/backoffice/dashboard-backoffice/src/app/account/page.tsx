"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  listUsers,
  updateUser,
  type PublicUser,
  type Role,
} from "../components/auth-api";
import { useAuth } from "../components/auth-context";

const fieldClassName = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 text-base text-stone-100 outline-none focus:border-brasa-400 focus:ring-2 focus:ring-brasa-400/20 disabled:opacity-60";

function roleLabel(role: Role): string {
  return { admin: "Administrador", manager: "Responsable", user: "Usuario" }[role];
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) return "No tienes permisos para realizar esta acción.";
  return error instanceof Error ? error.message : fallback;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sin fecha"
    : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(date);
}

export default function AccountPage() {
  const { user, refreshSession } = useAuth();
  const isAdmin = user?.role === "admin";
  const canListUsers = isAdmin || user?.role === "manager";
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("user");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirmation, setEditPasswordConfirmation] = useState("");
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [directorySuccess, setDirectorySuccess] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!canListUsers) {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    setUsersError(null);
    try {
      setUsers(await listUsers());
    } catch (error) {
      setUsersError(errorMessage(error, "No se pudo cargar el directorio."));
    } finally {
      setLoadingUsers(false);
    }
  }, [canListUsers]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  async function saveOwnAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || savingAccount) return;
    setAccountError(null);
    setAccountSuccess(null);

    const newEmail = email.trim();
    const changes: { email?: string; password?: string } = {};
    if (newEmail !== user.email) changes.email = newEmail;
    if (password) {
      if (password !== passwordConfirmation) {
        setAccountError("Las contraseñas no coinciden.");
        return;
      }
      changes.password = password;
    }
    if (Object.keys(changes).length === 0) {
      setAccountError("No hay cambios para guardar.");
      return;
    }

    setSavingAccount(true);
    try {
      await updateUser(user.id, changes);
      await refreshSession();
      setPassword("");
      setPasswordConfirmation("");
      setAccountSuccess("Los datos de acceso se actualizaron.");
    } catch (error) {
      setAccountError(errorMessage(error, "No se pudo actualizar la cuenta."));
    } finally {
      setSavingAccount(false);
    }
  }

  function beginEditing(account: PublicUser) {
    setEditingUser(account);
    setEditEmail(account.email);
    setEditRole(account.role);
    setEditActive(account.is_active);
    setEditPassword("");
    setEditPasswordConfirmation("");
    setDirectoryError(null);
    setDirectorySuccess(null);
  }

  async function saveManagedAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser || !isAdmin || savingUser) return;
    setDirectoryError(null);
    setDirectorySuccess(null);

    if (editPassword && editPassword !== editPasswordConfirmation) {
      setDirectoryError("Las contraseñas no coinciden.");
      return;
    }

    const changes: { email?: string; password?: string; role?: Role; is_active?: boolean } = {};
    if (editEmail.trim() !== editingUser.email) changes.email = editEmail.trim();
    if (editRole !== editingUser.role) changes.role = editRole;
    if (editActive !== editingUser.is_active) changes.is_active = editActive;
    if (editPassword) changes.password = editPassword;
    if (Object.keys(changes).length === 0) {
      setDirectoryError("No hay cambios para guardar.");
      return;
    }

    setSavingUser(true);
    try {
      const updated = await updateUser(editingUser.id, changes);
      setUsers((current) => current.map((account) => account.id === updated.id ? updated : account));
      setEditingUser(updated);
      setEditEmail(updated.email);
      setEditRole(updated.role);
      setEditActive(updated.is_active);
      setEditPassword("");
      setEditPasswordConfirmation("");
      setDirectorySuccess("La cuenta se actualizó.");
      if (updated.id === user?.id) await refreshSession();
    } catch (error) {
      setDirectoryError(errorMessage(error, "No se pudo actualizar la cuenta."));
    } finally {
      setSavingUser(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brasa-400">Acceso y permisos</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-50">Cuenta</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Administra tus credenciales y revisa la información de las cuentas disponibles para tu rol.</p>
        </div>
        <Link href="/account/profile" className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-200 hover:border-brasa-400 focus-visible:outline-2 focus-visible:outline-brasa-400">
          Gestionar perfil
        </Link>
      </header>

      <section aria-labelledby="own-account-heading" className="grid gap-8 border-b border-stone-800 pb-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(20rem,1fr)]">
        <div>
          <h2 id="own-account-heading" className="text-lg font-semibold text-stone-100">Tu cuenta</h2>
          <p className="mt-2 text-sm leading-6 text-stone-400">Cambia tu email o establece una contraseña nueva. Deja la contraseña vacía si no necesitas modificarla.</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
            <dt className="text-stone-500">Rol actual</dt>
            <dd className="text-stone-200">{user ? roleLabel(user.role) : ""}</dd>
            <dt className="text-stone-500">Estado</dt>
            <dd className="text-emerald-300">Activa</dd>
          </dl>
        </div>

        <form onSubmit={saveOwnAccount} aria-busy={savingAccount} className="space-y-5">
          <div>
            <label htmlFor="account-email" className="text-sm text-stone-300">Email</label>
            <input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={savingAccount} className={fieldClassName} />
          </div>
          <div>
            <label htmlFor="account-password" className="text-sm text-stone-300">Nueva contraseña <span className="text-stone-500">(opcional)</span></label>
            <input id="account-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={savingAccount} className={fieldClassName} />
          </div>
          {password && (
            <div>
              <label htmlFor="account-password-confirmation" className="text-sm text-stone-300">Confirmar contraseña nueva</label>
              <input id="account-password-confirmation" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} disabled={savingAccount} className={fieldClassName} />
            </div>
          )}
          {accountError && <p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-300">{accountError}</p>}
          {accountSuccess && <p role="status" className="border-l-2 border-emerald-500 pl-3 text-sm text-emerald-300">{accountSuccess}</p>}
          <button type="submit" disabled={savingAccount} className="rounded-lg bg-brasa-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-brasa-400 disabled:opacity-60">
            {savingAccount ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>

      {canListUsers && (
        <section aria-labelledby="directory-heading" className="space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="directory-heading" className="text-lg font-semibold text-stone-100">Directorio de cuentas</h2>
              <p className="mt-1 text-sm text-stone-400">
                {isAdmin ? "Puedes actualizar roles, estado y credenciales." : "Vista de consulta; solo un administrador puede cambiar otras cuentas."}
              </p>
            </div>
            <button type="button" onClick={() => void loadUsers()} disabled={loadingUsers} className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:border-brasa-400 focus-visible:outline-2 focus-visible:outline-brasa-400 disabled:opacity-50">
              {loadingUsers ? "Actualizando..." : "Actualizar lista"}
            </button>
          </header>

          {usersError && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-red-500 pl-3">
              <p role="alert" className="text-sm text-red-300">{usersError}</p>
              <button type="button" onClick={() => void loadUsers()} className="text-sm text-brasa-400 underline underline-offset-4">Reintentar</button>
            </div>
          )}

          {loadingUsers && <p className="py-4 text-sm text-stone-400" role="status">Cargando cuentas...</p>}
          {!loadingUsers && !usersError && users.length === 0 && <p className="py-4 text-sm text-stone-400">No hay cuentas para mostrar.</p>}

          {!loadingUsers && !usersError && users.length > 0 && (
            <div className="divide-y divide-stone-800 border-y border-stone-800 sm:hidden">
              {users.map((account) => (
                <article key={account.id} className="space-y-3 py-4">
                  <div className="break-all text-sm text-stone-200">
                    {account.email}{account.id === user?.id && <span className="ml-2 whitespace-nowrap text-xs text-stone-500">(tú)</span>}
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                    <dt className="text-stone-500">Rol</dt><dd className="text-stone-300">{roleLabel(account.role)}</dd>
                    <dt className="text-stone-500">Estado</dt><dd className={account.is_active ? "text-emerald-300" : "text-stone-500"}>{account.is_active ? "Activa" : "Desactivada"}</dd>
                    <dt className="text-stone-500">Creada</dt><dd className="text-stone-400">{dateLabel(account.created_at)}</dd>
                  </dl>
                  {isAdmin && <button type="button" onClick={() => beginEditing(account)} className="rounded-md px-2 py-1 text-sm text-brasa-400 hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-brasa-400" aria-label={`Editar ${account.email}`}>Editar cuenta</button>}
                </article>
              ))}
            </div>
          )}

          {!loadingUsers && !usersError && users.length > 0 && (
            <div className="hidden overflow-x-auto border-y border-stone-800 sm:block">
              <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-stone-500">
                  <tr className="border-b border-stone-800">
                    <th scope="col" className="px-3 py-3 font-medium">Email</th>
                    <th scope="col" className="px-3 py-3 font-medium">Rol</th>
                    <th scope="col" className="px-3 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-3 py-3 font-medium">Creada</th>
                    {isAdmin && <th scope="col" className="px-3 py-3 font-medium"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((account) => (
                    <tr key={account.id} className="border-b border-stone-800/70 last:border-b-0">
                      <td className="max-w-64 break-all px-3 py-4 text-stone-200">{account.email}{account.id === user?.id && <span className="ml-2 whitespace-nowrap text-xs text-stone-500">(tú)</span>}</td>
                      <td className="px-3 py-4 text-stone-300">{roleLabel(account.role)}</td>
                      <td className="px-3 py-4"><span className={account.is_active ? "text-emerald-300" : "text-stone-500"}>{account.is_active ? "Activa" : "Desactivada"}</span></td>
                      <td className="whitespace-nowrap px-3 py-4 text-stone-400">{dateLabel(account.created_at)}</td>
                      {isAdmin && <td className="px-3 py-4 text-right"><button type="button" onClick={() => beginEditing(account)} className="rounded-md px-2 py-1 text-brasa-400 hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-brasa-400" aria-label={`Editar ${account.email}`}>Editar</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isAdmin && editingUser && (
            <form onSubmit={saveManagedAccount} aria-busy={savingUser} className="grid gap-6 border-t border-stone-800 pt-6 md:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-stone-100">Editar cuenta</h3>
                <p className="mt-1 break-all text-sm text-stone-400">{editingUser.email}</p>
              </div>
              <div className="space-y-5">
                <div>
                  <label htmlFor="managed-email" className="text-sm text-stone-300">Email</label>
                  <input id="managed-email" type="email" required value={editEmail} onChange={(event) => setEditEmail(event.target.value)} disabled={savingUser} className={fieldClassName} />
                </div>
                <div>
                  <label htmlFor="managed-role" className="text-sm text-stone-300">Rol</label>
                  <select id="managed-role" value={editRole} onChange={(event) => setEditRole(event.target.value as Role)} disabled={savingUser} className={fieldClassName}>
                    <option value="user">Usuario</option>
                    <option value="manager">Responsable</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 text-sm text-stone-300">
                  <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} disabled={savingUser} className="size-4 accent-brasa-500" />
                  Cuenta activa
                </label>
                <div>
                  <label htmlFor="managed-password" className="text-sm text-stone-300">Establecer contraseña nueva <span className="text-stone-500">(opcional)</span></label>
                  <input id="managed-password" type="password" autoComplete="new-password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} disabled={savingUser} className={fieldClassName} />
                </div>
                {editPassword && (
                  <div>
                    <label htmlFor="managed-password-confirmation" className="text-sm text-stone-300">Confirmar contraseña nueva</label>
                    <input id="managed-password-confirmation" type="password" autoComplete="new-password" value={editPasswordConfirmation} onChange={(event) => setEditPasswordConfirmation(event.target.value)} disabled={savingUser} className={fieldClassName} />
                  </div>
                )}
                {directoryError && <p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-300">{directoryError}</p>}
                {directorySuccess && <p role="status" className="border-l-2 border-emerald-500 pl-3 text-sm text-emerald-300">{directorySuccess}</p>}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={savingUser} className="rounded-lg bg-brasa-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brasa-500 focus-visible:outline-2 focus-visible:outline-brasa-400 disabled:opacity-60">
                    {savingUser ? "Guardando..." : "Guardar cuenta"}
                  </button>
                  <button type="button" onClick={() => setEditingUser(null)} disabled={savingUser} className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-300 hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-brasa-400">
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}