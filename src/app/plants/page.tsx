"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, Plus } from "lucide-react";
import { PlantCard } from "@/components/plants/plant-card";
import { PlantDoc } from "@/types/types";

interface Task {
  id: string;
  plantName: string;
  task: string;
  dueDate: string;
  dueInDays: number;
  completed: boolean;
  priority: "Low" | "Medium" | "High";
}

export default function PlantDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plants, setPlants] = useState<PlantDoc[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/plants", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load plants (${res.status})`);
      }
      const data: PlantDoc[] = await res.json();
      setPlants(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Failed fetching plants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const taskLabel = (type: string) => {
    switch (type) {
      case "water":
        return "Water plant";
      case "fertilize":
        return "Fertilize";
      case "prune":
        return "Prune leaves";
      case "repot":
        return "Repot";
      case "inspect":
        return "Inspect for pests";
      default:
        return type;
    }
  };

  const taskPriority = (type: string): Task["priority"] => {
    switch (type) {
      case "repot":
      case "prune":
      case "water":
        return "High";
      case "fertilize":
        return "Medium";
      case "inspect":
      default:
        return "Low";
    }
  };

  // (Removed old isSameDay/addDays helpers; new task logic uses modular arithmetic directly.)

  useEffect(() => {
    if (!plants || plants.length === 0) {
      setTasks([]);
      return;
    }
    const now = new Date();
    const newTasks: Task[] = [];

    for (const p of plants) {
      const plantName = p.label.commonName || p.label.scientificName || "Plant";
      const createdAt = new Date(p.createdAt);
      if (createdAt > now) continue; // ignore future-created data anomalies
      const schedules = Array.isArray(p.schedule) ? p.schedule : [];

      for (const s of schedules) {
        const interval = Math.max(1, Number(s.intervalDays) || 0);
        if (!interval) continue;

        // Days since creation (floored) ensures consistent cycle alignment
        const diffDays = Math.max(
          0,
          Math.floor(
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
        const remainder = diffDays % interval;
        const dueInDays = remainder === 0 ? 0 : interval - remainder; // 0 means due today
        if (dueInDays > 30) continue; // ignore far-future tasks to keep list tight

        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + dueInDays);

        const dueDateLabel =
          dueInDays === 0
            ? "Today"
            : dueInDays === 1
            ? "Tomorrow"
            : targetDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });

        newTasks.push({
          id: `${p._id}_${s.type}_${targetDate.toISOString().slice(0, 10)}`,
          plantName,
          task: taskLabel(s.type),
          dueDate: dueDateLabel,
          dueInDays,
          completed: false,
          priority: taskPriority(s.type),
        });
      }
    }

    newTasks.sort((a, b) => {
      if (a.dueInDays !== b.dueInDays) return a.dueInDays - b.dueInDays;
      const rank = (p: Task) =>
        p.priority === "High" ? 0 : p.priority === "Medium" ? 1 : 2;
      const pa = rank(a);
      const pb = rank(b);
      if (pa !== pb) return pa - pb;
      return a.task.localeCompare(b.task);
    });

    setTasks(newTasks);
  }, [plants]);

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDeletePlant = async (plantId: string) => {
    try {
      const res = await fetch("/api/plants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete");
      }
      setPlants((prev) =>
        prev ? prev.filter((p) => p._id !== plantId) : prev
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message || "Delete failed");
    }
  };

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.dueInDays === 0),
    [tasks]
  );
  const weeklyTasks = useMemo(
    () => tasks.filter((task) => task.dueInDays >= 1 && task.dueInDays <= 7),
    [tasks]
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen page-bg-home">
      <div className="mx-auto max-w-7xl">
        <div className="flex">
          {/* Main */}
          <main className="flex-1 p-3 sm:p-4 md:p-6">
            {/* Desktop header + Add Plant */}
            <div className="hidden md:flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground text-balance">
                  Plant Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitor your plants and stay on top of care tasks
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Plant
              </Button>
            </div>

            {/* Mobile header */}
            <div className="md:hidden mb-5">
              <h1 className="text-2xl font-bold text-foreground">Plants</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Care tasks & collection overview
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="gap-1 h-8 px-3">
                  <Plus className="h-4 w-4" /> Add Plant
                </Button>
              </div>
            </div>

            {/* Task Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 md:mb-8">
              {/* Today */}
              <Card className="md:max-h-[320px]">
                <CardHeader className="py-3 md:py-4">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base font-medium">
                    <Clock className="h-5 w-5 text-red-500" />
                    Today&apos;s Tasks
                    <Badge variant="secondary">{todayTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:max-h-[calc(320px-56px)] overflow-y-auto pr-1">
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/40"
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 shrink-0"
                      >
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            task.completed
                              ? "text-primary fill-primary"
                              : "text-muted-foreground hover:text-primary"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-[13px] leading-5 ${
                            task.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {task.task}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {task.plantName}
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {todayTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No tasks for today
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* This Week */}
              <Card className="md:max-h-[320px]">
                <CardHeader className="py-3 md:py-4">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base font-medium">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    This Week
                    <Badge variant="secondary">{weeklyTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:max-h-[calc(320px-56px)] overflow-y-auto pr-1">
                  {weeklyTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/40"
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 shrink-0"
                      >
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            task.completed
                              ? "text-primary fill-primary"
                              : "text-muted-foreground hover:text-primary"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-[13px] leading-5 ${
                            task.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {task.task}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {task.plantName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {weeklyTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Nothing scheduled this week
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Plants list */}
            <div>
              <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">
                My Plants
              </h2>
              {loading && (
                <p className="text-sm text-muted-foreground">Loading plants…</p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                {plants?.map((plant, idx) => (
                  <PlantCard
                    plant={plant}
                    onDelete={handleDeletePlant}
                    key={idx}
                  />
                ))}
                {!loading && !error && (!plants || plants.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No plants yet.
                  </p>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
