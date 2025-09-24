"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Droplets,
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

  // Extend plant with optional fields that might exist from different API shapes
  type ExtendedPlant = PlantDoc & {
    photoUrl?: string;
    image?: string;
    id?: string;
    plantId?: string;
  };
  const extended = plant as ExtendedPlant;
  const photo =
    extended.photoUrl || extended.imageUrl || extended.image || "/soils.jpg";
  const plantId = extended._id || extended.id || extended.plantId || "";

  return (
    <Card className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_24px_rgba(2,44,34,0.06)] flex flex-col md:flex-row py-0 gap-0 w-full max-w-[350px] sm:max-w-[420px] md:max-w-none mx-auto">
      {/* Image section (left) */}
      <div className="relative w-full md:w-56 flex-shrink-0 aspect-[5/3] md:aspect-auto md:min-h-[260px] md:self-stretch">
        <Image
          src={photo}
          alt={name}
          fill
          sizes="(max-width:768px) 100vw, 224px"
          className="object-cover overflow-hidden"
          priority={false}
        />
      </div>
      <CardContent className="flex flex-col flex-1 py-4 md:py-5 px-5 sm:px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-[22px] md:text-[26px] leading-7 font-extrabold text-foreground break-words">
              {name}
            </h3>
            <p className="text-[14px] md:text-[15px] leading-6 text-muted-foreground italic">
              {scientific}
            </p>
          </div>
          {plantId && (
            <Button
              asChild
              variant="default"
              className="rounded-xl h-9 px-4 mt-2 md:mt-0 bg-emerald-600 hover:bg-emerald-600/90 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-sm"
            >
              <Link href={`/plants/${plantId}`}>Plant Detail</Link>
            </Button>
          )}
        </div>

        {/* Care info row */}
        <div className="mt-5 flex gap-3 w-full flex-1 min-h-[140px] overflow-x-auto md:overflow-visible pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Hide scrollbar for WebKit */}
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {scheduleTypes.map((type) => {
            const item = getScheduleItem(type);
            const meta = metaByType[type];
            const hasInterval = !!item?.intervalDays && item.intervalDays! > 0;
            return (
              <div
                key={type}
                className={`flex flex-col rounded-2xl border ${meta.border} ${
                  meta.bg
                } p-3 flex-1 min-w-[150px] sm:min-w-0 shadow-[0_4px_10px_rgba(2,44,34,0.05)] ${
                  !item ? "opacity-55" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-xl ${meta.pillBg} grid place-items-center`}
                  >
                    {meta.icon}
                  </div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wide ${meta.headerText}`}
                  >
                    {meta.label}
                  </div>
                </div>
                <div className={`mt-2 ${meta.daysText}`}>
                  <span className="text-[18px] font-extrabold">
                    {hasInterval ? item?.intervalDays : "—"}
                  </span>{" "}
                  {hasInterval && (
                    <span className="text-[12px] font-bold">days</span>
                  )}
                </div>
                {item?.notes && (
                  <p
                    className={`mt-1 text-[12px] leading-5 ${meta.descText} line-clamp-3`}
                  >
                    {item.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
