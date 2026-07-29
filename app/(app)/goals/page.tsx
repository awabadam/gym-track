import { getStrengthData, getAchievedGoals } from "@/data/goals";
import { PageHeader } from "@/components/shared/page-header";
import { StrengthSection } from "@/components/shared/strength-section";
import { AchievementsShowcase } from "@/components/shared/achievements-showcase";

export default async function GoalsPage() {
  const [strength, achievements] = await Promise.all([
    getStrengthData(),
    getAchievedGoals(),
  ]);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        subtitle="Personal records & targets"
        eyebrow="// Strength"
      />
      <div className="reveal [animation-delay:120ms]">
        <StrengthSection data={strength} today={today} />
      </div>
      <div className="reveal [animation-delay:220ms]">
        <AchievementsShowcase achievements={achievements} variant="full" />
      </div>
    </div>
  );
}
