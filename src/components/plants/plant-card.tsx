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
import type { PlantDoc } from "@/types/types";
import Link from "next/link";
import type { ReactNode } from "react";

interface PlantCardProps {
  plant: PlantDoc;
  onDelete?: (plantId: string) => Promise<void> | void;
}

export function PlantCard({ plant }: PlantCardProps) {
  const name =
    plant?.label?.commonName || plant?.label?.scientificName || "Unknown";
  const scientific = plant?.label?.scientificName || "–";

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
      headerText: string;
      pillBg: string;
      pillText: string;
      daysText: string;
      descText: string;
    }
  > = {
    water: {
      label: "WATERING",
      icon: <Droplets className="h-5 w-5 text-sky-600" />,
      bg: "bg-sky-50",
      border: "border-sky-100",
      headerText: "text-sky-800",
      pillBg: "bg-sky-100",
      pillText: "text-sky-800",
      daysText: "text-sky-900",
      descText: "text-sky-900/70",
    },
    fertilize: {
      label: "FERTILIZE",
      icon: <Sprout className="h-5 w-5 text-emerald-600" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      headerText: "text-emerald-800",
      pillBg: "bg-emerald-100",
      pillText: "text-emerald-800",
      daysText: "text-emerald-900",
      descText: "text-emerald-900/70",
    },
    prune: {
      label: "PRUNE",
      icon: <Scissors className="h-5 w-5 text-rose-600" />,
      bg: "bg-rose-50",
      border: "border-rose-100",
      headerText: "text-rose-800",
      pillBg: "bg-rose-100",
      pillText: "text-rose-800",
      daysText: "text-rose-900",
      descText: "text-rose-900/70",
    },
    repot: {
      label: "REPOT",
      icon: <Package className="h-5 w-5 text-indigo-600" />,
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      headerText: "text-indigo-800",
      pillBg: "bg-indigo-100",
      pillText: "text-indigo-800",
      daysText: "text-indigo-900",
      descText: "text-indigo-900/70",
    },
    inspect: {
      label: "INSPECT",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      bg: "bg-amber-50",
      border: "border-amber-100",
      headerText: "text-amber-800",
      pillBg: "bg-amber-100",
      pillText: "text-amber-800",
      daysText: "text-amber-900",
      descText: "text-amber-900/70",
    },
  };

  const getScheduleItem = (type: (typeof scheduleTypes)[number]) =>
    plant?.schedule?.find((s) => s.type === type);

  const photo =
    (plant as any)?.photoUrl ||
    (plant as any)?.imageUrl ||
    (plant as any)?.image ||
    "/soils.jpg";

  return (
    <Card className="overflow-hidden rounded-3xl border bg-white shadow-[0_8px_24px_rgba(2,44,34,0.06)]">
      <CardContent className="p-0">
        {/* Header: thumbnail + titles (mirip gambar) */}
        <div className="px-5 pt-5 pb-3 flex items-start gap-4">
          <div className="relative h-24 w-24 rounded-2xl overflow-hidden shadow-[0_10px_18px_rgba(0,0,0,0.18)]">
            <Image
              src={photo}
              alt={name}
              fill
              sizes="96px"
              className="object-cover"
              priority={false}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-[28px] leading-7 font-extrabold text-foreground">
              {name}
            </h3>
            <p className="text-[17px] leading-6 text-muted-foreground">
              {scientific}
            </p>
          </div>
        </div>

        {/* Tiles 2x2 mirip referensi */}
        <div className="px-4 pb-5">
          <div className="grid grid-cols-2 gap-3">
            {scheduleTypes.map((type) => {
              const item = getScheduleItem(type);
              if (!item) return null;
              const meta = metaByType[type];
              const hasInterval = !!item.intervalDays && item.intervalDays > 0;

              return (
                <div
                  key={type}
                  className={`rounded-[18px] border ${meta.border} ${meta.bg} p-4 shadow-[0_8px_18px_rgba(2,44,34,0.05)]`}
                >
                  {/* Header kecil: ikon + label uppercase */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-xl ${meta.pillBg} grid place-items-center`}
                    >
                      {meta.icon}
                    </div>
                    <div
                      className={`text-[12px] font-bold uppercase tracking-wide ${meta.headerText}`}
                    >
                      {meta.label}
                    </div>
                  </div>

                  {/* Days tebal */}
                  <div className={`mt-2 ${meta.daysText}`}>
                    <span className="text-[18px] font-extrabold">
                      {hasInterval ? item.intervalDays : "—"}
                    </span>{" "}
                    {hasInterval && (
                      <span className="text-[15px] font-bold">days</span>
                    )}
                  </div>

                  {/* Deskripsi 2 baris */}
                  {item.notes && (
                    <p
                      className={`mt-2 text-[15px] leading-6 ${meta.descText} line-clamp-2`}
                    >
                      {item.notes}
                    </p>
                  )}

                  {/* Add button (kiri bawah) */}
                  {hasInterval && (
                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="h-8 rounded-xl px-3"
                      >
                        <Link
                          href={buildGoogleCalendarLink(
                            meta.label,
                            item.intervalDays!,
                            item.notes || ""
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          <CalendarPlus className="h-4 w-4" />
                          Add
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
