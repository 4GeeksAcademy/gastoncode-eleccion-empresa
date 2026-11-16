import { Suspense } from "react";
import { AuthForm, AuthLoading } from "../components/auth-form";

export default function RegisterPage() {
  return <Suspense fallback={<AuthLoading />}><AuthForm mode="register" /></Suspense>;
}