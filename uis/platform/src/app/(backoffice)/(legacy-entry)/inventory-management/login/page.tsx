import { moduleLogin } from "@/lib/module-login";

export default function InventoryLogin({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  return moduleLogin(searchParams, "/inventory-management");
}
