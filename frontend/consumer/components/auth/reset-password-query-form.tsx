"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordQueryForm() {
  const searchParams = useSearchParams();
  const token =
    searchParams.get("token")?.trim() ||
    searchParams.get("reset_token")?.trim() ||
    searchParams.get("t")?.trim() ||
    "";

  return <ResetPasswordForm token={token} />;
}
