"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Sun, Clock, Trash2 } from "lucide-react";
import Image from "next/image";
import { Care, PlantDoc } from "@/types/types";

interface PlantCardProps {
  plant: PlantDoc;
  onDelete?: (plantId: string) => Promise<void> | void;
}

function hasLight(care: PlantDoc["care"]): care is Care {
  return typeof care === "object" && care !== null && "light" in care;
}

export function PlantCard({ plant, onDelete }: PlantCardProps) {
  const name =
    plant.label.commonName || plant.label.scientificName || "Unknown";
  const scientific = plant.label.scientificName || "–";

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-0 bg-gradient-to-r from-white to-green-50/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
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
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-balance text-gray-900">
                  {name}
                </h3>
                <p className="text-base text-gray-600 font-medium mt-1">
                  {scientific}
                </p>
              </div>

              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(plant._id);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>

            {/* Care Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Droplets className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                    Watering
                  </p>
                  <p className="text-sm font-bold text-blue-900">
                    {/* If schedule contains water, show interval */}
                    {plant.schedule?.find((s) => s.type === "water")
                      ?.intervalDays
                      ? `${
                          plant.schedule.find((s) => s.type === "water")!
                            .intervalDays
                        } days`
                      : "–"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Sun className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                    Light
                  </p>
                  <p className="text-sm font-bold text-amber-900">
                    {hasLight(plant.care) ? plant.care.light : "–"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="p-2 rounded-lg bg-green-100">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Inspect
                  </p>
                  <p className="text-sm font-bold text-green-900">
                    {plant.schedule?.find((s) => s.type === "inspect")
                      ?.intervalDays
                      ? `${
                          plant.schedule.find((s) => s.type === "inspect")!
                            .intervalDays
                        } days`
                      : "–"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
