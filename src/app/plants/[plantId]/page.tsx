"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Trash2,
  Droplets,
  Sun,
  Sprout,
  Calendar,
  AlertTriangle,
  Package,
  Layers,
  Leaf,
  FileText,
  Home,
  ShoppingCart,
} from "lucide-react";
import type { ProductType } from "@/types/ProductType";
import { toSlug } from "@/lib/slug";
import toast from "react-hot-toast";
import ScrollFadeX from "@/components/ui/scroll-fade";

// Simple Rupiah formatter for consistent display
function formatIDR(value: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
  }
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
    light: string | { level?: string; explanation?: string };
    water: string | { level?: string; explanation?: string };
    soil: string | { level?: string; explanation?: string };
    commonIssues: string[];
    suppliesNeeded: string[];
  };
  schedule: Array<{
    type: string;
    intervalDays: number;
    notes: string;
  }>;
  notes: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  recommendedProducts?: Array<{
    _id?: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    imgUrl: string;
    category: string;
    score?: number;
  }>;
}

export default function PlantDetail() {
  const params = useParams<{ plantId: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<PlantData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<
    Array<ProductType & { slug?: string }>
  >([]);
  const [loadingRec, setLoadingRec] = useState<boolean>(false);
  const careText = (val: unknown): string => {
    if (typeof val === "string") return val;
    if (
      typeof val === "object" &&
      val !== null &&
      "explanation" in (val as Record<string, unknown>)
    ) {
      const v = val as { explanation?: unknown };
      return typeof v.explanation === "string" ? v.explanation : "";
    }
    return "";
  };

  const careLevel = (val: unknown): string | null => {
    if (
      typeof val === "object" &&
      val !== null &&
      "level" in (val as Record<string, unknown>)
    ) {
      const v = val as { level?: unknown };
      if (typeof v.level === "string") return v.level.toLowerCase();
    }
    return null;
  };

  const careLevelIcon = (
    kind: "light" | "water" | "soil",
    level: string | null
  ) => {
    const lvl = (level || "").toLowerCase();
    if (kind === "light") {
      const color =
        lvl === "high"
          ? "text-amber-600"
          : lvl === "moderate" || lvl === "medium"
            ? "text-amber-500"
            : lvl === "low"
              ? "text-amber-400"
              : "text-amber-500";
      return <Sun className={`h-4 w-4 ${color}`} />;
    }
    if (kind === "water") {
      const color =
        lvl === "high"
          ? "text-blue-700"
          : lvl === "moderate" || lvl === "medium"
            ? "text-blue-500"
            : lvl === "low"
              ? "text-blue-400"
              : "text-blue-500";
      return <Droplets className={`h-4 w-4 ${color}`} />;
    }
    // soil
    const soilColor = lvl.includes("drain")
      ? "text-emerald-600"
      : "text-emerald-500";
    return <Layers className={`h-4 w-4 ${soilColor}`} />;
  };

  const careLevelLabel = (
    kind: "light" | "water" | "soil",
    level: string | null
  ): string | null => {
    if (!level) return null;
    const lvl = level.toLowerCase();
    if (kind === "light") {
      if (lvl === "high" || lvl.includes("full")) return "full sun";
    }
    return level;
  };

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

  // Load recommended products: prefer saved recommendations, fallback to query
  useEffect(() => {
    const fetchRecommended = async () => {
      if (!plant) return;
      try {
        setLoadingRec(true);
        if (
          Array.isArray(plant.recommendedProducts) &&
          plant.recommendedProducts.length > 0
        ) {
          const items = plant.recommendedProducts.map((p) => ({
            // coerce to ProductType shape subset used by UI
            _id: String(p._id ?? ""),
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            imgUrl: p.imgUrl,
            category: p.category,
          })) as unknown as ProductType[];
          setRecommended(items);
          return;
        }
        const supplies = plant.care?.suppliesNeeded || [];
        const labelBits = [plant.label?.commonName, plant.label?.scientificName]
          .filter(Boolean)
          .join(" ");
        const qBase = [...supplies].join(" ");
        const q = (qBase || labelBits || "").slice(0, 200);
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("pageSize", "8");
        const res = await fetch(`/api/products?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok)
          throw new Error(`Failed to load recommendations (${res.status})`);
        const data = await res.json();
        const items: ProductType[] = Array.isArray(data?.items)
          ? (data.items as ProductType[])
          : [];
        setRecommended(items);
      } catch (e) {
        console.warn(e);
        setRecommended([]);
      } finally {
        setLoadingRec(false);
      }
    };
    fetchRecommended();
  }, [plant]);

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
      alert(message);
    }
  };

  const handleAddRecommended = async (productId?: string) => {
    if (!productId) return;
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        let msg = "Failed to add to cart";
        try {
          const j = await res.json();
          msg = j?.message || j?.error || msg;
        } catch { }
        toast.error(msg);
        return;
      }
      toast.success("Added to cart");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart:refresh"));
      }
      router.refresh();
    } catch (e) {
      toast.error("Failed to add to cart");
    }
  };

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case "water":
        return <Droplets className="h-4 w-4 text-blue-500" />;
      case "inspect":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "fertilize":
        return <Sprout className="h-4 w-4 text-green-500" />;
      default:
        return <Calendar className="h-4 w-4" />;
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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

      <div className="grid gap-8 md:grid-cols-2">
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
          <CardContent className="space-y-4 relative z-10">
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <span>Light Requirements</span>
                {careLevelLabel(
                  "light",
                  careLevel(plant.care.light as unknown)
                ) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] leading-4 px-1.5 py-0 capitalize"
                    >
                      {careLevelLabel(
                        "light",
                        careLevel(plant.care.light as unknown)
                      )}
                    </Badge>
                  )}
              </p>
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="mt-0.5">
                  {careLevelIcon(
                    "light",
                    careLevel(plant.care.light as unknown)
                  )}
                </span>
                <span>{careText(plant.care.light as unknown)}</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <span>Watering</span>
                {careLevelLabel(
                  "water",
                  careLevel(plant.care.water as unknown)
                ) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] leading-4 px-1.5 py-0 capitalize"
                    >
                      {careLevelLabel(
                        "water",
                        careLevel(plant.care.water as unknown)
                      )}
                    </Badge>
                  )}
              </p>
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="mt-0.5">
                  {careLevelIcon(
                    "water",
                    careLevel(plant.care.water as unknown)
                  )}
                </span>
                <span>{careText(plant.care.water as unknown)}</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <span>Soil Requirements</span>
                {careLevelLabel(
                  "soil",
                  careLevel(plant.care.soil as unknown)
                ) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] leading-4 px-1.5 py-0 capitalize"
                    >
                      {careLevelLabel(
                        "soil",
                        careLevel(plant.care.soil as unknown)
                      )}
                    </Badge>
                  )}
              </p>
              <p className="text-sm text-foreground flex items-start gap-2">
                <span className="mt-0.5">
                  {careLevelIcon("soil", careLevel(plant.care.soil as unknown))}
                </span>
                <span>{careText(plant.care.soil as unknown)}</span>
              </p>
            </div>
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
            {plant.schedule.map((task, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 bg-secondary rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getScheduleIcon(task.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground capitalize">
                      {task.type}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Every {formatInterval(task.intervalDays)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{task.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2 mt-8">
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

      {/* Recommended Products (replaces Plant Information) */}
      <Card className="mt-8 relative overflow-hidden">
        {/* Background icon */}
        <div className="pointer-events-none absolute -top-6 -right-6">
          <Package className="w-40 h-40 text-primary/10 blur-2xl" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg">Recommended Products</CardTitle>
          <CardDescription>
            Suggested items for this plant’s care
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          {loadingRec ? (
            <p className="text-sm text-muted-foreground">
              Loading recommendations…
            </p>
          ) : recommended.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No recommended products found right now.
            </div>
          ) : (
            <ScrollFadeX contentClassName="items-stretch">
              {recommended.map((p) => {
                const pid = String(p._id || "");
                const slug = `/products/${toSlug(p.name, pid)}`;
                const canAdd = Boolean(pid);
                return (
                  <div key={pid || p.name} className="min-w-[220px] w-56 flex-shrink-0">
                    <div className="h-full rounded-lg overflow-hidden border bg-card hover:shadow-md transition-shadow flex flex-col">
                      <Link href={slug} className="block">
                        <div className="relative w-full aspect-square bg-muted">
                          <Image src={p.imgUrl} alt={p.name} fill className="object-cover" />
                        </div>
                      </Link>
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <Link href={slug} className="block">
                          <p className="text-[13px] leading-snug font-medium line-clamp-2 text-slate-800 break-words min-h-[2.6rem]">
                            {p.name}
                          </p>
                        </Link>
                        <div className="pt-0.5">
                          <p className="text-sm font-semibold text-emerald-700">
                            {formatIDR(Number(p.price || 0))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 mt-auto"
                          onClick={() => handleAddRecommended(pid)}
                          disabled={!canAdd}
                          aria-label={`Add ${p.name} to cart`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </ScrollFadeX>
          )}
        </CardContent>
      </Card>

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
