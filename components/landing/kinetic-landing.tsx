import Link from "next/link";
import {
  Dumbbell,
  ListChecks,
  Timer,
  TrendingUp,
  LineChart,
  ArrowRight,
  Check,
} from "lucide-react";

const LIFTS = [
  "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row",
  "Romanian Deadlift", "Lat Pulldown", "Hip Thrust", "Leg Press",
  "Lateral Raise", "Incline Curl", "Face Pull", "Front Squat", "Calf Raise",
];

const STATS = [
  { value: "2×", unit: "/ week", label: "Every muscle hit" },
  { value: "10+", unit: "sets", label: "Per muscle / week" },
  { value: "~45", unit: "min", label: "Per session" },
  { value: "e1RM", unit: "tracked", label: "On every lift" },
];

const STEPS = [
  {
    no: "01",
    name: "Build your split",
    body: "Start from the seeded Upper/Lower program or make your own — days, exercises, supersets, rep ranges and a target RIR. Reorder and duplicate in seconds.",
  },
  {
    no: "02",
    name: "Log every set",
    body: "On the gym floor: tap in weight, reps and RIR. The rest timer runs, the screen stays awake, and an unfinished session is waiting when you come back.",
  },
  {
    no: "03",
    name: "Let it progress",
    body: "Clear the top of your rep range at the target RIR and GymTrack calls the next weight. Double progression, handled — no mental math between sets.",
  },
];

const FEATURES = [
  { icon: ListChecks, name: "Build it", body: "Splits, supersets, rep ranges, target RIR — your program, your rules." },
  { icon: Timer, name: "Log it", body: "Weight, reps, RIR per set. Rest timer, wake-lock, resume anytime." },
  { icon: TrendingUp, name: "Progress it", body: "Double progression picks your next weight the moment you earn it." },
  { icon: LineChart, name: "Watch it", body: "e1RM trends, best sets and weekly volume — the line going up." },
];

const FLOOR = [
  "Built-in rest timer",
  "Screen wake-lock",
  "Resume in-progress sessions",
  "Per-set RIR tracking",
  "Supersets & rep ranges",
  "Double-progression calls",
  "Estimated 1RM trend",
  "Weekly volume overview",
  "Light & dark themes",
];

const FAQ = [
  {
    q: "Do I have to set everything up?",
    a: "No. Sign up and a complete Upper/Lower program is waiting — start logging immediately, tweak it whenever.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Every program and workout is scoped to your account. Nobody else sees your logs.",
  },
  {
    q: "What does it cost?",
    a: "Free to start. Create an account and train — that's it.",
  },
];

/** A seamless scrolling band; `reverse` sends it the other way. */
function Marquee({
  items,
  reverse = false,
  variant = "ink",
}: {
  items: string[];
  reverse?: boolean;
  variant?: "ink" | "signal";
}) {
  const skin =
    variant === "signal"
      ? "bg-signal text-signal-foreground"
      : "bg-foreground text-background";
  return (
    <div className={`flex overflow-hidden border-y-2 border-foreground ${skin} py-3`}>
      <div className={`flex shrink-0 ${reverse ? "marquee-rev" : "marquee"}`}>
        {[0, 1].map((dup) => (
          <ul key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
            {items.map((l, i) => (
              <li key={`${dup}-${i}`} className="flex items-center gap-6 whitespace-nowrap px-6">
                <span className="text-2xl uppercase md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                  {l}
                </span>
                <span aria-hidden className="text-lg opacity-50">✕</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function KineticLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <style>{`
        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee { animation: marquee-scroll 32s linear infinite; }
        .marquee-rev { animation: marquee-scroll 32s linear infinite reverse; }
        @media (prefers-reduced-motion: reduce) {
          .marquee, .marquee-rev { animation: none; }
        }
      `}</style>

      {/* nav */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
            <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.3em]">GymTrack</span>
        </div>
        <Link
          href="/sign-in"
          className="border-2 border-foreground px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-foreground hover:text-background"
        >
          Sign in
        </Link>
      </header>

      {/* hero */}
      <section className="px-5 pt-12 pb-8 text-center md:pt-20">
        <p className="reveal font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Build · Log · Progress
        </p>
        <h1 className="reveal mx-auto mt-5 max-w-5xl text-[15vw] leading-[0.82] md:text-[8.5rem]" style={{ animationDelay: "60ms" }}>
          Make the{" "}
          <span className="inline-block bg-signal px-3 text-signal-foreground">numbers</span>{" "}
          move.
        </h1>
        <p className="reveal mx-auto mt-7 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground" style={{ animationDelay: "120ms" }}>
          A workout tracker that turns every logged set into momentum. Lift, record,
          and let progression do the math.
        </p>
        <div className="reveal mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: "180ms" }}>
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-7 py-3.5 font-mono text-sm font-bold uppercase tracking-[0.1em] text-background shadow-[4px_4px_0_0_var(--signal)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0_0_var(--signal)]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center border-2 border-foreground px-7 py-3.5 font-mono text-sm font-bold uppercase tracking-[0.1em] transition-colors hover:bg-secondary"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* kinetic bands */}
      <section className="mt-10 -rotate-1">
        <Marquee items={LIFTS} variant="ink" />
      </section>
      <section className="-mt-[2px] rotate-1">
        <Marquee items={[...LIFTS].reverse()} reverse variant="signal" />
      </section>

      {/* stats strip */}
      <section className="mt-14 px-5 md:mt-20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 border-2 border-foreground md:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`border-foreground px-5 py-8 ${i % 2 === 0 ? "border-r-2" : ""} ${i < 3 ? "md:border-r-2" : ""} ${i < 2 ? "border-b-2 md:border-b-0" : ""}`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl tabular-nums md:text-5xl">{s.value}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{s.unit}</span>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-4xl md:text-6xl">Three moves</h2>
          <p className="mx-auto mt-4 max-w-md text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            From empty bar to personal best
          </p>
          <div className="mt-12 grid gap-px border-2 border-foreground bg-foreground md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.no} className="flex flex-col bg-background p-7">
                <span className="text-6xl tabular-nums text-signal md:text-7xl" style={{ WebkitTextStroke: "1px var(--foreground)" }}>
                  {s.no}
                </span>
                <h3 className="mt-5 text-2xl">{s.name}</h3>
                <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="bg-secondary px-5 py-20 md:py-28">
        <h2 className="text-center text-4xl md:text-6xl">Four moving parts</h2>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.name}
                className="group border-2 border-foreground bg-card p-7 shadow-[4px_4px_0_0_var(--shadow-color)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--signal)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center border-2 border-foreground transition-colors group-hover:bg-signal group-hover:text-signal-foreground">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-2xl">{f.name}</h3>
                <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* on the gym floor — feature checklist */}
      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.4fr] md:items-center">
          <div>
            <h2 className="text-4xl md:text-5xl">Built for the gym floor</h2>
            <p className="mt-4 max-w-sm font-mono text-sm leading-relaxed text-muted-foreground">
              Everything you need mid-set, nothing you don&apos;t. Big tap targets,
              no clutter, works one-handed between sets.
            </p>
          </div>
          <ul className="grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2">
            {FLOOR.map((item) => (
              <li key={item} className="flex items-center gap-3 bg-background px-4 py-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.08em]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA band */}
      <section className="rotate-1">
        <Marquee items={["Sign up free", "No spreadsheet", "Track every rep", "Beat last week"]} variant="signal" />
      </section>

      {/* FAQ */}
      <section className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl md:text-5xl">Straight answers</h2>
          <dl className="mt-10 border-2 border-foreground">
            {FAQ.map((f, i) => (
              <div key={f.q} className={`p-6 ${i > 0 ? "border-t-2 border-foreground" : ""}`}>
                <dt className="text-lg">{f.q}</dt>
                <dd className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* final CTA */}
      <section className="px-5 pb-24 text-center">
        <h2 className="mx-auto max-w-3xl text-4xl md:text-7xl">
          Last week was the <span className="text-signal">warm-up.</span>
        </h2>
        <Link
          href="/sign-up"
          className="mt-9 inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.1em] text-background shadow-[4px_4px_0_0_var(--signal)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0_0_var(--signal)]"
        >
          Create your account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="flex flex-col items-center justify-between gap-2 border-t-2 border-foreground px-5 py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:flex-row">
        <span>GymTrack © 2026</span>
        <span>Track every rep</span>
      </footer>
    </main>
  );
}
