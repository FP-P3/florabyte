"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
import {
  Trash2,
  Droplets,
  Sun,
  Sprout,
  Calendar,
  AlertTriangle,
  Package,
} from "lucide-react";

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
    light: string;
    water: string;
    soil: string;
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
}

export default function PlantDetail() {
  const params = useParams<{ plantId: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<PlantData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      alert(message);
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
        </div>
      </div>
      {/* Image Section */}
      <Card className="mb-8">
        <CardContent className="p-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Scientific Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              Care Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                Light Requirements
              </p>
              <p className="text-sm text-foreground">{plant.care.light}</p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                Watering
              </p>
              <p className="text-sm text-foreground">{plant.care.water}</p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-1">
                Soil Requirements
              </p>
              <p className="text-sm text-foreground">{plant.care.soil}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planting Plan */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Planting Plan</CardTitle>
          <CardDescription>Step-by-step guide for planting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Care Schedule
          </CardTitle>
          <CardDescription>Regular maintenance tasks</CardDescription>
        </CardHeader>
        <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Supplies Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
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

      {/* Metadata */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Plant Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Plant ID</p>
            <p className="text-foreground font-mono">{plant._id}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Created</p>
            <p className="text-foreground">
              {new Date(plant.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Last Updated</p>
            <p className="text-foreground">
              {new Date(plant.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-center">
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
