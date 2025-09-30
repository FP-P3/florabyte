"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toSlug } from "@/lib/slug";
import {
  Trash2,
  Droplets,
  Droplet,
  Sun,
  CloudSun,
  Moon,
  Sprout,
  Layers,
  Calendar,
  CalendarPlus,
  AlertTriangle,
  Package,
  Scissors,
  Leaf,
  FileText,
  Home,
} from "lucide-react";
// (Removed unused ProductType import)

// New flexible types to accommodate updated backend shape
type DateValue = string | { $date: string };
interface CareAspectObj {
  level: string;
  explanation: string;
}
type CareAspect = string | CareAspectObj;
interface RecommendedProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
  category: string;
  score?: number;
}
interface PlantData {
  _id: string;
  label: {
    scientificName: string;
    commonName: string;
    genus: string;
    family: string;
  };
  imageUrl: string;
  part: string;
  plantingPlan: {
    medium: string;
    potSize: string;
    steps: string[];
  };
  care: {
    light: CareAspect;
    water: CareAspect;
    soil: CareAspect;
    commonIssues: string[];
    suppliesNeeded: string[];
  };
  schedule: Array<{
    type: string;
    intervalDays: number;
    notes: string;
  }>;
  notes: string[];
  recommendedProducts?: RecommendedProduct[];
  userId: string;
  createdAt: DateValue;
  updatedAt: DateValue;
}

export default function PlantDetail() {
  const params = useParams<{ plantId: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<PlantData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Removed unused recommended products fallback & legacy care helpers (careText, careLevel*, etc.)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/plants/${params.plantId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to load (status ${res.status})`);
        }
        const data: PlantData = await res.json();
        setPlant(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    if (params?.plantId) load();
  }, [params?.plantId]);

  const handleDeletePlant = async () => {
    if (!plant?._id) return;
    try {
      const res = await fetch(`/api/plants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId: plant._id }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete");
      }
      router.push("/plants");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message);
    }
  };

  const getScheduleMeta = (type: string) => {
    switch (type) {
      case "water":
        return {
          icon: <Droplets className="h-6 w-6 text-sky-600" />,
          card: "bg-sky-50 border border-sky-200",
        };
      case "fertilize":
        return {
          icon: <Sprout className="h-6 w-6 text-emerald-600" />,
          card: "bg-emerald-50 border border-emerald-200",
        };
      case "prune":
        return {
          icon: <Scissors className="h-6 w-6 text-rose-600" />,
          card: "bg-rose-50 border border-rose-200",
        };
      case "repot":
        return {
          icon: <Package className="h-6 w-6 text-indigo-600" />,
          card: "bg-indigo-50 border border-indigo-200",
        };
      case "inspect":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
          card: "bg-amber-50 border border-amber-200",
        };
      default:
        return {
          icon: <Calendar className="h-6 w-6 text-primary" />,
          card: "bg-muted border border-border",
        };
    }
  };

  const formatInterval = (days: number) => {
    if (days >= 365) {
      return `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`;
    } else if (days >= 30) {
      return `${Math.round(days / 30)} month${days >= 60 ? "s" : ""}`;
    } else if (days >= 7) {
      return `${Math.round(days / 7)} week${days >= 14 ? "s" : ""}`;
    } else {
      return `${days} day${days > 1 ? "s" : ""}`;
    }
  };

  // (renderCareAspect removed – inlined in new care instructions layout)

  // Helpers for new level pill UI
  const normalizeLevel = (raw: string | undefined) => {
    if (!raw) return "";
    const picked = raw.includes("|") ? raw.split("|").pop() : raw; // take last part after |
    return picked
      ?.trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getLevelMeta = (
    aspect: "light" | "water" | "soil",
    levelRaw: string
  ) => {
    const lvl = levelRaw.toLowerCase();
    if (aspect === "light") {
      if (lvl.includes("full"))
        return {
          icon: <Sun className="h-3.5 w-3.5" />,
          bg: "bg-amber-100",
          text: "text-amber-700",
        };
      if (lvl.includes("partial") || lvl.includes("part"))
        return {
          icon: <CloudSun className="h-3.5 w-3.5" />,
          bg: "bg-lime-100",
          text: "text-lime-700",
        };
      if (lvl.includes("low") || lvl.includes("shade"))
        return {
          icon: <Moon className="h-3.5 w-3.5" />,
          bg: "bg-violet-100",
          text: "text-violet-700",
        };
      return {
        icon: <Sun className="h-3.5 w-3.5" />,
        bg: "bg-amber-100",
        text: "text-amber-700",
      };
    }
    if (aspect === "water") {
      if (lvl.includes("moderate"))
        return {
          icon: <Droplets className="h-3.5 w-3.5" />,
          bg: "bg-sky-100",
          text: "text-sky-700",
        };
      if (lvl.includes("high") || lvl.includes("frequent"))
        return {
          icon: <Droplets className="h-3.5 w-3.5" />,
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      if (
        lvl.includes("low") ||
        lvl.includes("minimal") ||
        lvl.includes("drought")
      )
        return {
          icon: <Droplet className="h-3.5 w-3.5" />,
          bg: "bg-cyan-100",
          text: "text-cyan-700",
        };
      return {
        icon: <Droplets className="h-3.5 w-3.5" />,
        bg: "bg-sky-100",
        text: "text-sky-700",
      };
    }
    // soil
    if (lvl.includes("well") || lvl.includes("drain"))
      return {
        icon: <Layers className="h-3.5 w-3.5" />,
        bg: "bg-emerald-100",
        text: "text-emerald-700",
      };
    if (lvl.includes("fertile") || lvl.includes("rich"))
      return {
        icon: <Sprout className="h-3.5 w-3.5" />,
        bg: "bg-green-100",
        text: "text-green-700",
      };
    return {
      icon: <Layers className="h-3.5 w-3.5" />,
      bg: "bg-emerald-100",
      text: "text-emerald-700",
    };
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);

  const buildGoogleCalendarLink = (
    action: string,
    intervalDays: number,
    notes: string
  ) => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
        d.getHours()
      )}${pad(d.getMinutes())}00`;
    const dates = `${fmt(start)}/${fmt(end)}`;
    const text = encodeURIComponent(action);
    const details = encodeURIComponent(
      `${notes || ""}\n\nAdded from Florabyte`
    );
    const ctz = encodeURIComponent(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    const recur =
      intervalDays && intervalDays > 0
        ? `&recur=${encodeURIComponent(
            `RRULE:FREQ=DAILY;INTERVAL=${intervalDays}`
          )}`
        : "";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${dates}&ctz=${ctz}${recur}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-sm text-muted-foreground">Plant not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 text-balance">
              {plant.label.commonName}
            </h1>
            <p className="text-lg text-muted-foreground italic">
              {plant.label.scientificName}
            </p>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              ID: {plant._id}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{plant.label.genus}</Badge>
              <Badge variant="outline">{plant.label.family}</Badge>
            </div>
          </div>
          <div className="flex items-start">
            <Button asChild variant="secondary" size="sm">
              <Link href="/plants">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Image Section */}
      <Card className="mb-8 relative overflow-hidden">
        {/* Background icon */}
        <div className="pointer-events-none absolute -top-8 -right-8">
          <Leaf className="w-48 h-48 text-primary/10 blur-2xl" />
        </div>
        <CardContent className="p-4 relative z-10">
          {/* Use h2 to keep a single h1 per page */}
          <h2 className="text-2xl font-semibold mb-4 text-center">
            Plant Image
          </h2>
          <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
            <Image
              src={plant.imageUrl || "/placeholder.svg"}
              alt={plant.label.commonName}
              fill
              className="object-cover"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        {/* Scientific Information */}
        <Card className="relative overflow-hidden">
          {/* Background icon */}
          <div className="pointer-events-none absolute -top-6 -right-6">
            <Sprout className="w-40 h-40 text-primary/10 blur-2xl" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Scientific Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            <div>
              <p className="font-medium text-sm text-muted-foreground">
                Scientific Name
              </p>
              <p className="text-foreground italic">
                {plant.label.scientificName}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">
                Common Name
              </p>
              <p className="text-foreground">{plant.label.commonName}</p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">Genus</p>
              <p className="text-foreground">{plant.label.genus}</p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">
                Family
              </p>
              <p className="text-foreground">{plant.label.family}</p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">
                Plant Part
              </p>
              <p className="text-foreground capitalize">{plant.part}</p>
            </div>
          </CardContent>
        </Card>

        {/* Care Instructions */}
        <Card className="relative overflow-hidden">
          {/* Background icon */}
          <div className="pointer-events-none absolute -top-6 -right-6">
            <Sun className="w-40 h-40 text-amber-500/10 blur-2xl" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              Care Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(["light", "water", "soil"] as const).map((kind) => {
              const val = plant.care[kind];
              const levelRaw = typeof val === "string" ? "" : val.level;
              const explanation =
                typeof val === "string" ? val : val.explanation;
              const normalized = normalizeLevel(levelRaw);
              const meta = normalized ? getLevelMeta(kind, normalized) : null;
              const label =
                kind === "light"
                  ? "Light"
                  : kind === "water"
                  ? "Water"
                  : "Soil";
              return (
                <div key={kind} className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {kind === "light" && (
                      <Sun className="h-5 w-5 text-amber-600" />
                    )}
                    {kind === "water" && (
                      <Droplets className="h-5 w-5 text-sky-600" />
                    )}
                    {kind === "soil" && (
                      <Layers className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-foreground">
                        {label}
                      </p>
                      {normalized && meta && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}
                        >
                          {meta.icon}
                          {normalized}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Planting Plan */}
      <Card className="mt-8 relative overflow-hidden">
        {/* Background icon */}
        <div className="pointer-events-none absolute -top-6 -right-6">
          <Layers className="w-40 h-40 text-primary/10 blur-2xl" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle>Planting Plan</CardTitle>
          <CardDescription>Step-by-step guide for planting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                Medium
              </p>
              <p className="text-sm text-foreground">
                {plant.plantingPlan.medium}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                Pot Size
              </p>
              <p className="text-sm text-foreground">
                {plant.plantingPlan.potSize}
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-muted-foreground mb-3">
              Planting Steps
            </p>
            <ol className="space-y-2">
              {plant.plantingPlan.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Care Schedule */}
      <Card className="mt-8 relative overflow-hidden">
        {/* Background icon */}
        <div className="pointer-events-none absolute -top-6 -right-6">
          <Calendar className="w-40 h-40 text-primary/10 blur-2xl" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Care Schedule
          </CardTitle>
          <CardDescription>Regular maintenance tasks</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-4">
            {plant.schedule.map((task, index) => {
              const meta = getScheduleMeta(task.type);
              return (
                <div
                  key={index}
                  className={`flex flex-col gap-3 p-4 rounded-xl md:flex-row md:items-start md:gap-4 ${meta.card}`}
                >
                  <div className="flex-shrink-0 flex items-start">
                    <div className="h-12 w-12 flex items-center justify-center">
                      {meta.icon}
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1 justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground capitalize">
                          {task.type}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Every {formatInterval(task.intervalDays)}
                        </Badge>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 rounded-md"
                      >
                        <a
                          href={buildGoogleCalendarLink(
                            `${task.type} - ${
                              plant.label.commonName ||
                              plant.label.scientificName
                            }`,
                            task.intervalDays,
                            task.notes
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Add ${task.type} schedule to Google Calendar`}
                        >
                          <CalendarPlus className="h-4 w-4" /> Add to Calendar
                        </a>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {task.notes}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 mt-8">
        {/* Common Issues */}
        <Card className="relative overflow-hidden">
          {/* Background icon */}
          <div className="pointer-events-none absolute -top-6 -right-6">
            <AlertTriangle className="w-40 h-40 text-destructive/10 blur-2xl" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ul className="space-y-2">
              {plant.care.commonIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground">{issue}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Supplies Needed */}
        <Card className="relative overflow-hidden">
          {/* Background icon */}
          <div className="pointer-events-none absolute -top-6 -right-6">
            <Package className="w-40 h-40 text-primary/10 blur-2xl" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Supplies Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ul className="space-y-2">
              {plant.care.suppliesNeeded.map((supply, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground">{supply}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {plant.notes.length > 0 && (
        <Card className="mt-8 relative overflow-hidden">
          {/* Background icon */}
          <div className="pointer-events-none absolute -top-6 -right-6">
            <FileText className="w-40 h-40 text-primary/10 blur-2xl" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <ul className="space-y-3">
              {plant.notes.map((note, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">
                    {note}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Products */}
      {plant.recommendedProducts && plant.recommendedProducts.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Recommended Products
            </CardTitle>
            <CardDescription>
              Suggested items to support this plant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {plant.recommendedProducts.map((prod) => {
                const slug = toSlug(prod.name, prod._id);
                return (
                  <Link
                    key={prod._id}
                    href={`/products/${slug}`}
                    className="group rounded-lg border p-3 flex flex-col gap-3 bg-card/50 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <div className="relative w-full aspect-video overflow-hidden rounded-md bg-muted">
                      <Image
                        src={prod.imgUrl || "/placeholder.svg"}
                        alt={prod.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {prod.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {prod.description}
                      </p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {formatPrice(prod.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <span className="capitalize">{prod.category}</span>
                      <span>Stock: {prod.stock}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex justify-center gap-3 flex-wrap">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="lg">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Plant
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                plant data for {plant.label.commonName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlant}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
