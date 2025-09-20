"use client";

import { useEffect, useState } from "react";
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
  completed: boolean;
  priority: "Low" | "Medium" | "High";
}

// removed mockPlants in favor of API data

const mockTasks: Task[] = [
  {
    id: "1",
    plantName: "Fiddle Leaf Fig",
    task: "Water plant",
    dueDate: "Today",
    completed: false,
    priority: "High",
  },
  {
    id: "2",
    plantName: "Monstera Deliciosa",
    task: "Check for pests",
    dueDate: "Today",
    completed: true,
    priority: "Medium",
  },
  {
    id: "3",
    plantName: "Snake Plant",
    task: "Rotate for sunlight",
    dueDate: "Tomorrow",
    completed: false,
    priority: "Low",
  },
  {
    id: "4",
    plantName: "Monstera Deliciosa",
    task: "Water plant",
    dueDate: "Tomorrow",
    completed: false,
    priority: "High",
  },
  {
    id: "5",
    plantName: "Fiddle Leaf Fig",
    task: "Fertilize",
    dueDate: "This week",
    completed: false,
    priority: "Medium",
  },
  {
    id: "6",
    plantName: "Snake Plant",
    task: "Repot",
    dueDate: "This month",
    completed: false,
    priority: "Low",
  },
  {
    id: "7",
    plantName: "Monstera Deliciosa",
    task: "Prune leaves",
    dueDate: "This month",
    completed: false,
    priority: "Medium",
  },
];

export default function PlantDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [tasks, setTasks] = useState(mockTasks);
  const [plants, setPlants] = useState<PlantDoc[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PlantDoc | null>(null);

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
      if (selectedPlant?._id === plantId) setSelectedPlant(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(message || "Delete failed");
    }
  };

  const handleBackToDashboard = () => {
    setSelectedPlant(null);
  };

  const todayTasks = tasks.filter((task) => task.dueDate === "Today");
  const weeklyTasks = tasks.filter(
    (task) => task.dueDate === "Tomorrow" || task.dueDate === "This week"
  );
  const monthlyTasks = tasks.filter((task) => task.dueDate === "This month");

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

  if (selectedPlant) {
    return (
      <div className="flex min-h-screen bg-background">
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
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={handleBackToDashboard}
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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  Today&apos;s Tasks
                  <Badge variant="secondary">{todayTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  This Week
                  <Badge variant="secondary">{weeklyTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

            {/* Monthly Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-500" />
                  This Month
                  <Badge variant="secondary">{monthlyTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {monthlyTasks.map((task) => (
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
              </CardContent>
            </Card>
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
