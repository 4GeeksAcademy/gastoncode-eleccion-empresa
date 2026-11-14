import { EXTERNAL_APP_PREFIXES, isExternalAppPath, loginDestination, safeAuthDestination } from "./auth-navigation";
import { describe, expect, test } from "@jest/globals";

describe("auth navigation helpers", () => {
  test.each(["/", "/account", "/account/profile", "/forgot-password", "/suppliers", "/incidents-manager/incidents"]) (
    "permite ruta local autenticada %s",
    (path) => expect(safeAuthDestination(path)).toBe(path),
  );

  test.each([null, "", "https://evil.example", "//evil.example", "/\\evil", "/account\n", "/unknown", "/suppliers-evil"]) (
    "redirige destino inseguro o no permitido a inicio: %s",
    (path) => expect(safeAuthDestination(path)).toBe("/"),
  );

  test("conserva query y hash en destino permitido y maneja urls relativas válidas", () => {
    expect(safeAuthDestination("/account/profile?tab=security#password")).toBe("/account/profile?tab=security#password");
  });

  test("rechaza rutas con caracteres de control codificados", () => {
    expect(safeAuthDestination("/account/%0Aadmin")).toBe("/");
  });

  test("rutas externas coinciden solo con su prefijo de segmento", () => {
    expect(EXTERNAL_APP_PREFIXES).toContain("/suppliers");
    expect(isExternalAppPath("/suppliers")).toBe(true);
    expect(isExternalAppPath("/suppliers/list")).toBe(true);
    expect(isExternalAppPath("/suppliers-old")).toBe(false);
    expect(isExternalAppPath("/account")).toBe(false);
  });

  test("loginDestination elimina query/hash del pathname y codifica destino", () => {
    expect(loginDestination("/incidents-manager/incidents?status=open#top")).toBe(
      "/login?next=%2Fincidents-manager%2Fincidents",
    );
    expect(loginDestination("https://evil.example/path")).toBe("/login?next=%2F");
  });

  test.each([
    "/inventory-management/products",
    "/inventory-management/inbound",
    "/inventory-management/outbound",
    "/inventory-management/orders",
  ])("conserva el destino de login para la página protegida %s", (path) => {
    expect(loginDestination(path)).toBe(`/login?next=${encodeURIComponent(path)}`);
  });

  test.each([null, "", "/", "/unknown", "//evil.example", "/\\evil", "/backoffice-old"])(
    "usa el inicio de platform para destinos ausentes o rechazados: %s",
    (path) => expect(safeAuthDestination(path, "/backoffice")).toBe("/backoffice"),
  );

  test("permite el dashboard nuevo solo cuando la aplicación lo configura", () => {
    expect(safeAuthDestination("/backoffice?tab=tools#catalog", "/backoffice")).toBe(
      "/backoffice?tab=tools#catalog",
    );
    expect(safeAuthDestination("/backoffice")).toBe("/");
  });

  test("conserva cuenta y elimina query/hash al invalidar una sesión de platform", () => {
    expect(safeAuthDestination("/account/profile?tab=details", "/backoffice")).toBe(
      "/account/profile?tab=details",
    );
    expect(loginDestination("/backoffice?tab=tools#catalog", "/backoffice")).toBe(
      "/login?next=%2Fbackoffice",
    );
  });
});
