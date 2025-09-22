"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  CalendarPlus,
  Sprout,
  Scissors,
  Package,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { PlantDoc } from "@/types/types";
import Link from "next/link";
import type { ReactNode } from "react";

interface PlantCardProps {
  plant: PlantDoc;
  onDelete?: (plantId: string) => Promise<void> | void;
}

export function PlantCard({ plant }: PlantCardProps) {
  const name =
    plant.label.commonName || plant.label.scientificName || "Unknown";
  const scientific = plant.label.scientificName || "–";

  const buildGoogleCalendarLink = (
    action: string,
    intervalDays: number,
    notes: string
  ) => {
    // Start today at 09:00 local time, 1-hour duration
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
        d.getHours()
      )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

    const dates = `${fmt(start)}/${fmt(end)}`;
    const text = encodeURIComponent(`${action} ${name}`);
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

  const scheduleTypes: Array<
    "water" | "fertilize" | "prune" | "repot" | "inspect"
  > = ["water", "fertilize", "prune", "repot", "inspect"];

  const metaByType: Record<
    (typeof scheduleTypes)[number],
    {
      label: string;
      icon: ReactNode;
      bg: string;
      border: string;
      text: string;
      pillBg: string;
      pillText: string;
    }
  > = {
    water: {
      label: "Watering",
      icon: <Droplets className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-900",
      pillBg: "bg-blue-100",
      pillText: "text-blue-800",
    },
    fertilize: {
      label: "Fertilize",
      icon: <Sprout className="h-5 w-5 text-emerald-600" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-900",
      pillBg: "bg-emerald-100",
      pillText: "text-emerald-800",
    },
    prune: {
      label: "Prune",
      icon: <Scissors className="h-5 w-5 text-rose-600" />,
      bg: "bg-rose-50",
      border: "border-rose-100",
      text: "text-rose-900",
      pillBg: "bg-rose-100",
      pillText: "text-rose-800",
    },
    repot: {
      label: "Repot",
      icon: <Package className="h-5 w-5 text-indigo-600" />,
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      text: "text-indigo-900",
      pillBg: "bg-indigo-100",
      pillText: "text-indigo-800",
    },
    inspect: {
      label: "Inspect",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-900",
      pillBg: "bg-amber-100",
      pillText: "text-amber-800",
    },
  };

  const getScheduleItem = (type: (typeof scheduleTypes)[number]) =>
    plant.schedule?.find((s) => s.type === type);

  return (
    <Card className="overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-0 bg-gradient-to-r from-white to-green-50/30">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Plant Image */}
          <div className="relative">
            <Image
              src={plant.imageUrl || "/placeholder.svg"}
              alt={name}
              className="w-32 h-32 rounded-2xl object-cover flex-shrink-0 shadow-lg"
              width={128}
              height={128}
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-transparent"></div>
          </div>

          {/* Plant Information */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-balance text-gray-900">
                  {name}
                </h3>
                <p className="text-base text-gray-600 font-medium mt-1">
                  {scientific}
                </p>
              </div>
            </div>

            {/* Schedule Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {scheduleTypes.map((type) => {
                const meta = metaByType[type];
                const item = getScheduleItem(type);
                if (!item) return null; // render only existing types
                const hasInterval =
                  !!item.intervalDays && item.intervalDays > 0;
                return (
                  <div
                    key={type}
                    className={`flex items-start gap-3 p-3 rounded-xl ${meta.bg} border ${meta.border}`}
                  >
                    <div className={`p-2 rounded-lg ${meta.pillBg}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold ${meta.pillText} uppercase tracking-wide`}
                      >
                        {meta.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`text-sm font-bold ${meta.text}`}>
                          {hasInterval ? `${item.intervalDays} days` : "–"}
                        </p>
                        {hasInterval && (
                          <Button
                            variant="secondary"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={buildGoogleCalendarLink(
                                meta.label,
                                item.intervalDays,
                                item.notes
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1"
                            >
                              <CalendarPlus className="h-4 w-4" />
                              <span className="hidden sm:inline">Add</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
