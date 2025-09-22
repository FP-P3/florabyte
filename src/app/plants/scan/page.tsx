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
import type { PlantData } from "@/types/types";

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
      window.location.href = "/plants";
    } catch (err) {
      console.log(err);
    }
  };

  if (scanState === "upload") {
    return (
      <div className="min-h-screen bg-background p-4 animate-fadeIn">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 transition-all duration-200 hover:bg-primary/15">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-semibold text-balance mb-2">
              Plant Scanner
            </h1>
            <p className="text-muted-foreground text-pretty text-[15px] tracking-[0.01em] leading-relaxed">
              Upload a photo of your plant to get instant identification and
              care instructions
            </p>
          </div>

          <Card className="rounded-xl florabyte-card-shadow transition-all duration-200 hover:ring-1 hover:ring-black/5">
            <CardContent className="p-6">
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-all duration-200 cursor-pointer hover:bg-accent/30"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4 transition-all duration-200" />
                <p className="text-[15px] text-muted-foreground mb-2 tracking-[0.01em]">
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
                  className="transition-all duration-200 hover:ring-1 hover:ring-black/5 bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-all duration-200 hover:ring-1 hover:ring-black/5 bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert className="mt-4 rounded-xl border-primary/20 bg-primary/5">
            <Leaf className="h-4 w-4 text-primary" />
            <AlertDescription className="text-[15px] tracking-[0.01em]">
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
      <div className="min-h-screen bg-background p-4 animate-fadeIn">
        <div className="mx-auto max-w-md">
          {error && (
            <Alert variant="destructive" className="mb-4 rounded-xl">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-[15px] tracking-[0.01em]">
                    {error.title}
                  </p>
                  {error.notes?.length ? (
                    <ul className="list-disc pl-5 text-sm">
                      {error.notes.map((n, i) => (
                        <li key={i} className="text-[15px] tracking-[0.01em]">
                          {n}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center mb-6">
            <h1 className="text-2xl font-heading font-semibold mb-2">
              Preview Your Plant
            </h1>
            <p className="text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
              Make sure the plant is clearly visible in the image
            </p>
          </div>

          <Card className="mb-6 rounded-xl florabyte-card-shadow">
            <CardContent className="p-4">
              <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-4">
                <Image
                  src={previewUrl || "/placeholder.svg"}
                  alt="Plant preview"
                  className="w-full h-full object-cover"
                  width={400}
                  height={400}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center text-[15px] tracking-[0.01em]">
                {selectedFile?.name}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={retakeScanner}
              className="transition-all duration-200 hover:ring-1 hover:ring-black/5 bg-transparent"
            >
              Retake
            </Button>
            <Button
              onClick={startScanning}
              className="transition-all duration-200"
            >
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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center animate-fadeIn">
        <div className="mx-auto max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6 animate-pulse">
            <Leaf className="h-10 w-10 text-primary animate-bounce" />
          </div>

          <h2 className="text-2xl font-heading font-semibold mb-2">
            Analyzing Your Plant
          </h2>
          <p className="text-muted-foreground mb-8 text-[15px] tracking-[0.01em] leading-relaxed">
            Our AI is identifying your plant and preparing care instructions...
          </p>

          <div className="space-y-4">
            <Progress value={scanProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-[15px] tracking-[0.01em]">
              {Math.round(scanProgress)}% complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (scanState === "results" && plantData) {
    return (
      <div className="min-h-screen bg-background p-4 animate-fadeIn">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-heading font-semibold mb-2">
              Plant Identified!
            </h1>
            <Badge variant="secondary" className="mb-2 rounded-full">
              {Math.round(plantData.ai.confidence * 100)}% confidence
            </Badge>
          </div>

          <div className="space-y-6">
            <Card className="rounded-xl florabyte-card-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="aspect-square w-full md:w-48 rounded-xl overflow-hidden bg-muted">
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
                    <h2 className="text-2xl font-heading font-semibold text-balance mb-2">
                      {plantData.ai.label.commonName}
                    </h2>
                    <p className="text-lg text-muted-foreground italic mb-4 text-[15px] tracking-[0.01em]">
                      {plantData.ai.label.scientificName}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-[15px] tracking-[0.01em]">
                          Genus:
                        </span>
                        <p className="text-muted-foreground text-[15px] tracking-[0.01em]">
                          {plantData.ai.label.genus}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-[15px] tracking-[0.01em]">
                          Family:
                        </span>
                        <p className="text-muted-foreground text-[15px] tracking-[0.01em]">
                          {plantData.ai.label.family}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Care Instructions */}
            <Card className="rounded-xl florabyte-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading font-semibold">
                  <Sun className="h-5 w-5" />
                  Care Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-[15px] tracking-[0.01em]">
                    <Sun className="h-4 w-4" />
                    Light Requirements
                  </h4>
                  <p className="text-sm text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
                    {plantData.ai.care.light}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-[15px] tracking-[0.01em]">
                    <Droplets className="h-4 w-4" />
                    Watering
                  </h4>
                  <p className="text-sm text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
                    {plantData.ai.care.water}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 text-[15px] tracking-[0.01em]">
                    Soil Requirements
                  </h4>
                  <p className="text-sm text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
                    {plantData.ai.care.soil}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Care Schedule */}
            <Card className="rounded-xl florabyte-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading font-semibold">
                  <Clock className="h-5 w-5" />
                  Care Schedule
                </CardTitle>
                <CardDescription className="text-[15px] tracking-[0.01em]">
                  Follow this schedule to keep your plant healthy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plantData.ai.schedule.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 transition-all duration-200 hover:bg-muted/70"
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
                          <span className="font-medium capitalize text-[15px] tracking-[0.01em]">
                            {item.type}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs rounded-full"
                          >
                            Every {item.intervalDays} day
                            {item.intervalDays > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
                          {item.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Planting Instructions */}
            <Card className="rounded-xl florabyte-card-shadow">
              <CardHeader>
                <CardTitle className="font-heading font-semibold">
                  Planting Instructions
                </CardTitle>
                <CardDescription className="text-[15px] tracking-[0.01em]">
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
                      <p className="text-sm text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Supplies Needed */}
            <Card className="rounded-xl florabyte-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading font-semibold">
                  <Package className="h-5 w-5" />
                  Supplies Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plantData.ai.care.suppliesNeeded.map((supply, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 transition-all duration-200 hover:bg-muted/70"
                    >
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-[15px] tracking-[0.01em]">
                        {supply}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            {plantData.ai.notes.length > 0 && (
              <Card className="rounded-xl florabyte-card-shadow">
                <CardHeader>
                  <CardTitle className="font-heading font-semibold">
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plantData.ai.notes.map((note, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-accent">•</span>
                        <span className="text-muted-foreground text-[15px] tracking-[0.01em] leading-relaxed">
                          {note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                variant="outline"
                onClick={resetScanner}
                className="transition-all duration-200 hover:ring-1 hover:ring-black/5 bg-transparent"
              >
                Scan Another Plant
              </Button>
              <Button
                className="hover: cursor-pointer transition-all duration-200"
                onClick={submitHandler}
              >
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
