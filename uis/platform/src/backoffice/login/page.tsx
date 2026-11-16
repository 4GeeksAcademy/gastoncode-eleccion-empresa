import { Suspense } from "react";
import { AuthForm, AuthLoading } from "../components/auth-form";

export default function LoginPage() {
  return <Suspense fallback={<AuthLoading />}><AuthForm mode="login" /></Suspense>;
}