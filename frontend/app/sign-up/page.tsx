import { SiteHeader } from "@/components/common/site-header";
import { SiteFooter } from "@/components/common/site-footer";
import { AuthPage } from "@/components/Auth/auth-page";

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <AuthPage mode="sign-up" />
      </main>
      <SiteFooter />
    </>
  );
}
