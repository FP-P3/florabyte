"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  Upload,
  Leaf,
  Clock,
  Droplets,
  Sun,
  Scissors,
  Eye,
  Package,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { PlantData } from "@/types/types";

type ScanState = "upload" | "preview" | "scanning" | "results";

export default function PlantScannerPage() {
  const [scanState, setScanState] = useState<ScanState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [scanProgress, setScanProgress] = useState(0);
  const [plantData, setPlantData] = useState<PlantData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<{
    title: string;
    notes?: string[];
  } | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanState("preview");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const startScanning = async () => {
    if (!selectedFile) return;

    setScanState("scanning");
    setScanProgress(0);
    setError(null);

    // Simulate scanning progress while waiting for API response
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(95, progress + Math.random() * 12);
      setScanProgress(progress);
    }, 1000);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/plants/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        // Try to show only reason and notes when API returns accepted:false
        try {
          const j = JSON.parse(raw);
          if (j?.accepted === false) {
            setError({
              title: j?.reason || "Analisis gagal",
              notes: Array.isArray(j?.ai?.notes) ? j.ai.notes : [],
            });
            setScanProgress(0);
            setScanState("preview");
            return;
          }
        } catch {
          // fallthrough to generic error
        }
        throw new Error(raw || `Request failed with status ${res.status}`);
      }

      const data: PlantData = await res.json();
      setPlantData(data);
      setScanProgress(100);
      setScanState("results");
    } catch (e) {
      setError({
        title: e instanceof Error ? e.message : "Failed to analyze the plant.",
      });
      setScanProgress(0);
      setScanState("preview");
    } finally {
      clearInterval(interval);
    }
  };

  const resetScanner = async () => {
    await fetch("/api/plants/analyze", {
      method: "DELETE",
      body: JSON.stringify({ url: plantData?.imageUrl }),
      headers: { "Content-Type": "application/json" },
    });

    setScanState("upload");
    setSelectedFile(null);
    setPreviewUrl("");
    setScanProgress(0);
    setPlantData(null);
    setError(null);
  };

  const retakeScanner = () => {
    setScanState("upload");
    setSelectedFile(null);
    setPreviewUrl("");
    setScanProgress(0);
    setPlantData(null);
    setError(null);
  };

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case "water":
        return <Droplets className="h-4 w-4" />;
      case "fertilize":
        return <Package className="h-4 w-4" />;
      case "prune":
        return <Scissors className="h-4 w-4" />;
      case "inspect":
        return <Eye className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getScheduleColor = (type: string) => {
    switch (type) {
      case "water":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "fertilize":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "prune":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "inspect":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const submitHandler = async () => {
    if (!plantData) return;

    try {
      const res = await fetch("/api/plants/add", {
        method: "POST",
        body: JSON.stringify({
          label: plantData.ai.label,
          imageUrl: plantData.imageUrl,
          part: plantData.ai.part,
          plantingPlan: plantData.ai.plantingPlan,
          care: plantData.ai.care,
          schedule: plantData.ai.schedule,
          notes: plantData.ai.notes,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed with status ${res.status}`);
      }
      window.location.href = "/plants/my-plants";
    } catch (err) {
      console.log(err);
    }
  };

  if (scanState === "upload") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-balance mb-2">
              Plant Scanner
            </h1>
            <p className="text-muted-foreground text-pretty">
              Upload a photo of your plant to get instant identification and
              care instructions
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your plant photo here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, WebP up to 10MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert className="mt-4">
            <Leaf className="h-4 w-4" />
            <AlertDescription>
              For best results, ensure your plant is well-lit and the entire
              plant or leaf is visible in the photo.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (scanState === "preview") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-md">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{error.title}</p>
                  {error.notes?.length ? (
                    <ul className="list-disc pl-5 text-sm">
                      {error.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Preview Your Plant</h1>
            <p className="text-muted-foreground">
              Make sure the plant is clearly visible in the image
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                <Image
                  src={previewUrl || "/placeholder.svg"}
                  alt="Plant preview"
                  className="w-full h-full object-cover"
                  width={400}
                  height={400}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {selectedFile?.name}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={retakeScanner}>
              Retake
            </Button>
            <Button onClick={startScanning}>
              <Leaf className="h-4 w-4 mr-2" />
              Scan Plant
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (scanState === "scanning") {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6 animate-pulse">
            <Leaf className="h-10 w-10 text-primary animate-bounce" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Analyzing Your Plant</h2>
          <p className="text-muted-foreground mb-8">
            Our AI is identifying your plant and preparing care instructions...
          </p>

          <div className="space-y-4">
            <Progress value={scanProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {Math.round(scanProgress)}% complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (scanState === "results" && plantData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Plant Identified!</h1>
            <Badge variant="secondary" className="mb-2">
              {Math.round(plantData.ai.confidence * 100)}% confidence
            </Badge>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="aspect-square w-full md:w-48 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={previewUrl || "/placeholder.svg"}
                        alt="Scanned plant"
                        className="w-full h-full object-cover"
                        width={192}
                        height={192}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-balance mb-2">
                      {plantData.ai.label.commonName}
                    </h2>
                    <p className="text-lg text-muted-foreground italic mb-4">
                      {plantData.ai.label.scientificName}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Genus:</span>
                        <p className="text-muted-foreground">
                          {plantData.ai.label.genus}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Family:</span>
                        <p className="text-muted-foreground">
                          {plantData.ai.label.family}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Care Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Care Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light Requirements
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {plantData.ai.care.light}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Watering
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {plantData.ai.care.water}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Soil Requirements</h4>
                  <p className="text-sm text-muted-foreground">
                    {plantData.ai.care.soil}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Care Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Care Schedule
                </CardTitle>
                <CardDescription>
                  Follow this schedule to keep your plant healthy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plantData.ai.schedule.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div
                        className={`p-2 rounded-full ${getScheduleColor(
                          item.type
                        )}`}
                      >
                        {getScheduleIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">
                            {item.type}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Every {item.intervalDays} day
                            {item.intervalDays > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Planting Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Planting Instructions</CardTitle>
                <CardDescription>
                  {plantData.ai.plantingPlan.medium} •{" "}
                  {plantData.ai.plantingPlan.potSize}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {plantData.ai.plantingPlan.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Supplies Needed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Supplies Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plantData.ai.care.suppliesNeeded.map((supply, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded bg-muted/50"
                    >
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{supply}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            {plantData.ai.notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Important Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plantData.ai.notes.map((note, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-accent">•</span>
                        <span className="text-muted-foreground">{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button variant="outline" onClick={resetScanner}>
                Scan Another Plant
              </Button>
              <Button className="hover: cursor-pointer" onClick={submitHandler}>
                Save to My Plants
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
