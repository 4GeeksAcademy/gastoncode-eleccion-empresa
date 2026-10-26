import {
  ApiError,
  SESSION_INVALIDATED_EVENT,
  TOKEN_KEY,
  UnauthorizedError,
  authHeaders,
  changePassword,
  clearToken,
  deleteUser,
  fetchMe,
  fetchProfile,
  fetchUser,
  forgotPassword,
  getToken,
  listUsers,
  login,
  publicErrorMessage,
  register,
  resetPassword,
  setToken,
  updateProfile,
  updateUser,
} from "./auth-api";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const publicUser = {
  id: "u-1",
  email: "ana@example.com",
  role: "user" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};
const profile = { id: "p-1", user_id: "u-1", name: "Ana", phone: null, address: null };

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
  clear(): void { this.data.clear(); }
}

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockedFetch(): any {
  return global.fetch as any;
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: new MemoryStorage(),
      dispatchEvent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
  global.fetch = jest.fn() as unknown as typeof fetch;
});

describe("sesión", () => {
  test("lee, guarda, elimina token y crea cabecera autorizada", () => {
    expect(getToken()).toBeNull();
    setToken("jwt-value");
    expect(getToken()).toBe("jwt-value");
    expect(authHeaders()).toEqual({ Authorization: "Bearer jwt-value" });
    clearToken();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(authHeaders()).toEqual({});
  });

  test("solicitud protegida sin token invalida sesión y no llama a fetch", async () => {
    const listener = jest.fn();
    window.dispatchEvent = listener as unknown as typeof window.dispatchEvent;
    await expect(fetchMe()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: SESSION_INVALIDATED_EVENT }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("operaciones de autenticación y API", () => {
  test("login envía credenciales sin autenticación y devuelve token válido", async () => {
    mockedFetch().mockResolvedValue(response({ access_token: "token-1", token_type: "bearer" }));
    await expect(login("ana@example.com", "clave segura")).resolves.toBe("token-1");
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST", cache: "no-store" }));
  });

  test("login rechaza respuesta exitosa sin token y credenciales no autorizadas", async () => {
    mockedFetch().mockResolvedValueOnce(response({ access_token: "" }));
    await expect(login("ana@example.com", "pass")).rejects.toThrow("token valido");
    mockedFetch().mockResolvedValueOnce(response({ detail: "invalid" }, 401));
    await expect(login("ana@example.com", "bad")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test("registro permite enviar campos opcionales y falla con conflicto o validación", async () => {
    mockedFetch().mockResolvedValueOnce(response({ user: publicUser, profile }));
    await expect(register({ email: publicUser.email, password: "12345678" })).resolves.toEqual({ user: publicUser, profile });
    expect(mockedFetch().mock.calls[0][1].body).toBe(JSON.stringify({ email: publicUser.email, password: "12345678" }));
    mockedFetch().mockResolvedValueOnce(response({}, 400));
    await expect(register({ email: publicUser.email, password: "bad" })).rejects.toMatchObject({ status: 400 });
    mockedFetch().mockResolvedValueOnce(response({}, 422));
    await expect(register({ email: "", password: "" })).rejects.toMatchObject({ status: 422 });
  });

  test("fetchMe obtiene usuario cuando sesión existe y descarta token ante 401", async () => {
    setToken("good-token");
    mockedFetch().mockResolvedValueOnce(response({ id: "u-1", email: publicUser.email, role: "user", profile }));
    await expect(fetchMe()).resolves.toMatchObject({ id: "u-1", profile });
    expect(mockedFetch().mock.calls[0][1].headers.get("Authorization")).toBe("Bearer good-token");

    mockedFetch().mockResolvedValueOnce(response({}, 401));
    await expect(fetchMe()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getToken()).toBeNull();
  });

  test("listUsers acepta lista vacía y propaga fallo de permisos", async () => {
    setToken("manager-token");
    mockedFetch().mockResolvedValueOnce(response([]));
    await expect(listUsers()).resolves.toEqual([]);
    mockedFetch().mockResolvedValueOnce(response({}, 403));
    await expect(listUsers()).rejects.toMatchObject({ status: 403 });
  });

  test("fetchUser codifica identificador y maneja recurso ausente", async () => {
    setToken("token");
    mockedFetch().mockResolvedValueOnce(response(publicUser));
    await expect(fetchUser("id with/slash")).resolves.toEqual(publicUser);
    expect(global.fetch).toHaveBeenLastCalledWith("/api/users/id%20with%2Fslash", expect.any(Object));
    mockedFetch().mockResolvedValueOnce(response({}, 404));
    await expect(fetchUser("missing")).rejects.toMatchObject({ status: 404 });
  });

  test("updateUser permite actualización parcial y propaga conflicto", async () => {
    setToken("token");
    mockedFetch().mockResolvedValueOnce(response(publicUser));
    await expect(updateUser("u-1", { is_active: true })).resolves.toEqual(publicUser);
    expect(mockedFetch().mock.calls[0][1].body).toBe(JSON.stringify({ is_active: true }));
    mockedFetch().mockResolvedValueOnce(response({}, 400));
    await expect(updateUser("u-1", { email: publicUser.email })).rejects.toMatchObject({ status: 400 });
  });

  test("deleteUser elimina y distingue recurso ausente", async () => {
    setToken("token");
    mockedFetch().mockResolvedValueOnce(response({ message: "Usuario eliminado" }));
    await expect(deleteUser("u-1")).resolves.toEqual({ message: "Usuario eliminado" });
    mockedFetch().mockResolvedValueOnce(response({}, 404));
    await expect(deleteUser("missing")).rejects.toMatchObject({ status: 404 });
  });

  test("fetchProfile soporta perfil válido y ausencia del recurso", async () => {
    setToken("token");
    mockedFetch().mockResolvedValueOnce(response(profile));
    await expect(fetchProfile()).resolves.toEqual(profile);
    mockedFetch().mockResolvedValueOnce(response({}, 404));
    await expect(fetchProfile()).rejects.toMatchObject({ status: 404 });
  });

  test("updateProfile admite cambios parciales y maneja fallo de validación", async () => {
    setToken("token");
    mockedFetch().mockResolvedValueOnce(response({ ...profile, name: "Ana María" }));
    await expect(updateProfile({ name: "Ana María" })).resolves.toMatchObject({ name: "Ana María" });
    mockedFetch().mockResolvedValueOnce(response({}, 422));
    await expect(updateProfile({ phone: "x" })).rejects.toMatchObject({ status: 422 });
  });

  test("forgotPassword no requiere sesión y permite respuesta genérica", async () => {
    mockedFetch().mockResolvedValueOnce(response({ message: "Si existe, se enviará." }));
    await expect(forgotPassword(publicUser.email)).resolves.toHaveProperty("message");
    mockedFetch().mockResolvedValueOnce(response({}, 422));
    await expect(forgotPassword("not-an-email")).rejects.toMatchObject({ status: 422 });
  });

  test("resetPassword acepta entrada mínima y propaga token inválido", async () => {
    mockedFetch().mockResolvedValueOnce(response({ message: "Restablecida" }));
    await expect(resetPassword("opaque-token", "12345678")).resolves.toHaveProperty("message");
    mockedFetch().mockResolvedValueOnce(response({}, 400));
    await expect(resetPassword("expired", "short")).rejects.toMatchObject({ status: 400 });
  });

  test("changePassword exige sesión, actualiza y rechaza contraseña actual errónea", async () => {
    setToken("token");
    mockedFetch().mockResolvedValueOnce(response({ message: "Actualizada" }));
    await expect(changePassword("current", "new-password")).resolves.toHaveProperty("message");
    expect(mockedFetch().mock.calls[0][1].body).toBe(JSON.stringify({ current_password: "current", new_password: "new-password" }));
    mockedFetch().mockResolvedValueOnce(response({}, 400));
    await expect(changePassword("wrong", "new-password")).rejects.toMatchObject({ status: 400 });
  });

  test("maneja errores de red y respuesta JSON inválida", async () => {
    setToken("token");
    mockedFetch().mockRejectedValueOnce(new TypeError("offline"));
    await expect(fetchMe()).rejects.toMatchObject({ status: 0 });
    mockedFetch().mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    await expect(fetchMe()).rejects.toMatchObject({ status: 502 });
  });
});

describe("mensajes públicos de error", () => {
  test.each([
    [new ApiError(0, "internal"), "No se pudo conectar con el servicio. Intenta nuevamente."],
    [new ApiError(502, "internal"), "El servicio devolvio una respuesta no valida."],
    [new ApiError(403, "secret detail"), "No tienes permiso para realizar esta accion."],
    [new ApiError(500, "secret detail"), "El servicio no pudo completar la solicitud. Intenta mas tarde."],
    [new TypeError("offline"), "No se pudo conectar con el servicio. Intenta nuevamente."],
  ])("oculta detalles internos y adapta errores conocidos", (error, expected) => {
    expect(publicErrorMessage(error)).toBe(expected);
  });

  test("utiliza fallback para errores desconocidos", () => {
    expect(publicErrorMessage(new Error("internal"), "custom fallback")).toBe("custom fallback");
  });
});
