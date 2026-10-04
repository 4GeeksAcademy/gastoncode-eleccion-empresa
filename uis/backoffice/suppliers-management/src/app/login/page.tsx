import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect(`${process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3000"}/login?next=%2Fsuppliers`);
}