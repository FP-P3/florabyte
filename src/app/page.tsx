// app/page.tsx  (TANPA "use client")
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Camera,
  BrainCircuit,
  ClipboardList,
  CalendarCheck2,
  ShieldCheck,
  Database,
  CloudUpload,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import FAQClient from "@/components/faq-client"; // <- client only
import SeoJsonLd from "@/components/seo-jsonld"; // <- server
export const dynamic = "force-static"; // SSG
export const revalidate = 86400; // ISR: 1 hari

export const metadata = {
  title: "Florabyte — Your personal botanist!",
  description:
    "Upload plant photos, get AI identification, care plans, schedules, and product recommendations powered by MongoDB vector search.",
  openGraph: {
    title: "Florabyte",
    description: "AI plant care with schedules and vector recommendations.",
    url: "https://florabyte.app/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Florabyte",
    description: "AI plant care",
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <SeoJsonLd />
      <Hero />
      <HowItWorks />
      <Features />
      {/* FAQ interaktif dipisah ke client component */}
      <section
        id="faq"
        className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16"
      >
        <h2 className="text-xl md:text-2xl font-semibold">FAQ</h2>
        <FAQClient />
      </section>
      <CTA />
      <Footer />
    </main>
  );
}

/* ------ komponen di bawah ini jangan pakai hooks (tetap server-rendered) ------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24 md:px-6">
        <div>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Meet Florabyte,{" "}
            <span className="text-emerald-700">your personal botanist!</span>.
          </h1>
          <p className="mt-4 text-base/7 text-muted-foreground md:text-lg">
            Upload a photo and let our AI do the heavy lifting. Florabyte
            verifies it’s a real plant, identify the species, and builds a
            practical care plan tailored to your routine watering cadence, light
            needs, soil mix, and watch-outs. It also surfaces high-quality
            essentials from your catalog so you can act immediately! Turn the
            plan into scheduled reminders and watch your plants thrive without
            guesswork.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="#get-started">Get started free</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="#features">See features</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Privacy-first
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              AI-powered
            </span>
            <span className="inline-flex items-center gap-1">
              <Database className="h-4 w-4 text-emerald-700" />
              MongoDB Vector
            </span>
          </div>
        </div>

        <div className="relative">
          <Card className="relative mx-auto aspect-[4/3] w-full max-w-lg">
            <CardContent className="h-full w-full p-3">
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-emerald-100 via-white to-emerald-50 grid place-items-center">
                <div className="text-center p-6">
                  <Camera className="mx-auto mb-3 h-8 w-8 text-emerald-700" />
                  <p className="text-sm text-muted-foreground">
                    Drop a plant photo here
                  </p>
                  <Button className="mt-4">Upload image</Button>
                </div>
              </div>
              <Card className="pointer-events-none absolute -right-4 -bottom-4 w-44 rotate-6 select-none shadow-md">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BrainCircuit className="h-4 w-4 text-emerald-700" />{" "}
                    Analyzing…
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Monstera deliciosa · 93% confidence
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "Upload",
      desc: "Snap or upload your plant photo.",
    },
    {
      icon: <BrainCircuit className="h-5 w-5" />,
      title: "Identify",
      desc: "AI validates if it’s a plant & identifies species.",
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      title: "Care plan",
      desc: "Light, water, soil & common issues—auto generated.",
    },
    {
      icon: <CalendarCheck2 className="h-5 w-5" />,
      title: "Schedule",
      desc: "One-tap reminders with recurring tasks.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-semibold">How it works</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {steps.map((s, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 text-emerald-700">
                {s.icon}
                <span className="text-sm font-medium">{s.title}</span>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {s.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const list = [
    {
      title: "AI detection with false-positive filter",
      desc: "Rejects non-plant photos before processing—saves time and tokens.",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-700" />,
    },
    {
      title: "Vector recommendations (MongoDB)",
      desc: "Suggests fertilizers, pots, and tools using embedding similarity.",
      icon: <Database className="h-5 w-5 text-emerald-700" />,
    },
    {
      title: "Cloudinary media pipeline",
      desc: "Fast uploads, transformations, and responsive delivery.",
      icon: <CloudUpload className="h-5 w-5 text-emerald-700" />,
    },
    {
      title: "Care schedules & reminders",
      desc: "Recurring tasks for water/fertilize/prune with one-tap completion.",
      icon: <CalendarCheck2 className="h-5 w-5 text-emerald-700" />,
    },
    {
      title: "Clean, responsive UI",
      desc: "Mobile-first layout scales beautifully on desktop.",
      icon: <Sparkles className="h-5 w-5 text-emerald-700" />,
    },
    {
      title: "Privacy by design",
      desc: "Own your data—export and delete anytime.",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-700" />,
    },
  ];
  return (
    <section
      id="features"
      className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16"
    >
      <h2 className="text-xl md:text-2xl font-semibold">Why Florabyte</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {list.map((f, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-center gap-2">
                {f.icon}
                <CardTitle className="text-base font-medium">
                  {f.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {f.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="get-started" className="mx-auto max-w-7xl px-4 md:px-6 py-16">
      <Card className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl">
        <CardContent className="p-8">
          <h2 className="text-2xl md:text-3xl font-bold">
            Start caring for your plants like a pro
          </h2>
          <p className="mt-2 max-w-2xl text-sm/6 text-white/90">
            Create a free account or explore the demo—upload, identify, and get
            a personalized care schedule in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/register">Create account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-blue-500 border-blue-500 text-black hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Link href="/login">Continue with Google</Link>
            </Button>
          </div>
          <ul className="mt-6 grid gap-2 text-sm/6 md:grid-cols-3">
            {[
              "No credit card required",
              "Cancel anytime",
              "Open-source roadmap",
            ].map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-top">
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row items-center justify-between gap-4 px-4 py-6 md:px-6 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Florabyte. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="#">Privacy</Link>
          <Link href="#">Terms</Link>
          <Link href="#">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
