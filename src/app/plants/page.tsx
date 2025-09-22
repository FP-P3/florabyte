"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  Camera,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";
import { PlantCard } from "@/components/plants/plant-card";
import { PlantDoc } from "@/types/types";
import Link from "next/link";

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
  const [activeNav, setActiveNav] = useState("dashboard");
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

  // Helper: map schedule type to label and priority
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

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };

  // Build tasks from plants' schedules
  useEffect(() => {
    if (!plants || plants.length === 0) {
      setTasks([]);
      return;
    }
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const newTasks: Task[] = [];

    for (const p of plants) {
      const plantName = p.label.commonName || p.label.scientificName || "Plant";
      const createdAt = new Date(p.createdAt);
      const schedules = Array.isArray(p.schedule) ? p.schedule : [];
      for (const s of schedules) {
        const interval = Math.max(1, Number(s.intervalDays) || 0);
        if (!interval || interval < 1) continue;
        const diffDays = Math.max(
          0,
          Math.floor((now.getTime() - createdAt.getTime()) / dayMs)
        );
        const cycles = Math.floor(diffDays / interval);
        const nextDue = addDays(createdAt, (cycles + 1) * interval);
        // Make sure same-day tasks are treated as due today
        const daysUntilRaw = (nextDue.getTime() - now.getTime()) / dayMs;
        const dueInDays = isSameDay(nextDue, now)
          ? 0
          : Math.max(0, Math.ceil(daysUntilRaw));
        // Only surface tasks due today or within next 30 days
        if (dueInDays < 0 || dueInDays > 30) continue;

        const dueDateLabel = isSameDay(nextDue, now)
          ? "Today"
          : dueInDays === 1
          ? "Tomorrow"
          : nextDue.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

        newTasks.push({
          id: `${p._id}_${s.type}_${nextDue.toISOString().slice(0, 10)}`,
          plantName,
          task: taskLabel(s.type),
          dueDate: dueDateLabel,
          dueInDays,
          completed: false,
          priority: taskPriority(s.type),
        });
      }
    }
    // Optional: sort by urgency (Today -> Tomorrow -> date), then priority
    newTasks.sort((a, b) => {
      if (a.dueInDays !== b.dueInDays) return a.dueInDays - b.dueInDays;
      const pa = a.priority === "High" ? 0 : a.priority === "Medium" ? 1 : 2;
      const pb = b.priority === "High" ? 0 : b.priority === "Medium" ? 1 : 2;
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
      // Optimistic UI update
      setPlants((prev) =>
        prev ? prev.filter((p) => p._id !== plantId) : prev
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(message || "Delete failed");
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
  // Monthly section removed; keeping only today and weekly buckets

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

  // Selected plant detail view previously returned a broken JSX tree.
  // Simplifying by always rendering the main dashboard layout.

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-green-50/50 to-background dark:from-emerald-950/40">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-6">
        <div className="flex items-center gap-2 mb-8">
          <Leaf className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-sidebar-foreground">
            My Plants
          </h1>
        </div>

        <nav className="space-y-2">
          <Button
            variant={activeNav === "dashboard" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => setActiveNav("dashboard")}
          >
            <Leaf className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={activeNav === "scan" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => setActiveNav("scan")}
          >
            <Camera className="h-4 w-4" />
            Scan
          </Button>
          <Button
            variant={activeNav === "plants" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => setActiveNav("plants")}
          >
            <Leaf className="h-4 w-4" />
            My Plants
          </Button>
          <Button
            variant={activeNav === "schedule" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => setActiveNav("schedule")}
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
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

          {/* Task Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Today's Tasks */}
            <Card className="h-[360px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  Today&apos;s Tasks
                  <Badge variant="secondary">{todayTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 h-[calc(360px-64px)] overflow-y-auto pr-1">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5"
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
                        className={`font-medium text-sm ${
                          task.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.task}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.plantName}
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-xs ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
                {todayTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks for today
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Weekly Tasks */}
            <Card className="h-[360px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  This Week
                  <Badge variant="secondary">{weeklyTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 h-[calc(360px-64px)] overflow-y-auto pr-1">
                {weeklyTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5"
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
                        className={`font-medium text-sm ${
                          task.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.task}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.plantName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Monthly Tasks removed per request */}
          </div>

          {/* Plant Overview Cards - Using PlantCard Component */}
          <div>
            <h2 className="text-xl font-semibold mb-6">My Plants</h2>
            {loading && (
              <p className="text-sm text-muted-foreground">Loading plants…</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="space-y-6">
              {plants?.map((plant, idx) => (
                <Link href={`/plants/${plant._id}`} key={idx}>
                  <PlantCard plant={plant} onDelete={handleDeletePlant} />
                </Link>
              ))}
              {!loading && !error && (!plants || plants.length === 0) && (
                <p className="text-sm text-muted-foreground">No plants yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
