import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect(`${process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3000"}/register?next=%2Fsuppliers`);
}