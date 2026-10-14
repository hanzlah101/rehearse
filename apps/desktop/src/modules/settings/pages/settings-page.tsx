import { PasswordDialog } from "@/modules/settings/components/password-dialog";
import { ProfileForm } from "@/modules/settings/components/profile-form";
import { SettingsSection } from "@/modules/settings/components/settings-section";
import { ThemePicker } from "@/modules/settings/components/theme-picker";

export function SettingsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-14 md:px-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl leading-none font-semibold">Settings</h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Your profile, password and how Rehearse looks.
          </p>
        </header>

        <SettingsSection
          description="How you appear in Rehearse."
          title="Profile"
        >
          <ProfileForm />
        </SettingsSection>

        <SettingsSection
          description="Changing it signs you out on every other device."
          title="Password"
        >
          <PasswordDialog />
        </SettingsSection>

        <SettingsSection
          description="Match your system, or pick light or dark."
          title="Appearance"
        >
          <ThemePicker />
        </SettingsSection>
      </div>
    </main>
  );
}
