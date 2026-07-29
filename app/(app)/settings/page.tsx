import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Block } from "@/components/shared/block";
import { AccountSettingsForm } from "@/components/shared/account-settings-form";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SignOutButton } from "@/components/shared/sign-out-button";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <div className="surface-quiet mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Account & preferences" />

      <Block title="Account" className="reveal [animation-delay:100ms]">
        <AccountSettingsForm
          initialName={session.user.name}
          email={session.user.email}
        />
      </Block>

      <Block title="Security" className="reveal [animation-delay:160ms]">
        <ChangePasswordForm />
      </Block>

      <Block title="Appearance" className="reveal [animation-delay:220ms]">
        <div className="flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Theme</p>
            <p className="text-xs text-muted-foreground">
              Paper (light) or ink (dark).
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Block>

      <Block title="Session" className="reveal [animation-delay:280ms]">
        <div className="flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">
              Sign out
            </p>
            <p className="text-xs text-muted-foreground">
              Signs this device out of {session.user.email}.
            </p>
          </div>
          <SignOutButton />
        </div>
      </Block>
    </div>
  );
}
