import { randomUUID } from "crypto";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  tags: string[];
}

export class TaskStore {
  private tasks: Map<string, Task> = new Map();

  create(input: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
    const now = new Date().toISOString();
    const task: Task = {
      ...input,
      id: randomUUID().slice(0, 8),
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(filters?: {
    status?: Task["status"];
    priority?: Task["priority"];
    assignee?: string;
  }): Task[] {
    let tasks = Array.from(this.tasks.values());
    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }
    if (filters?.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }
    if (filters?.assignee) {
      tasks = tasks.filter((t) => t.assignee === filters.assignee);
    }
    return tasks.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  update(
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt">>
  ): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    completionRate: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    }

    const done = byStatus["done"] || 0;
    const total = tasks.length;

    return {
      total,
      byStatus,
      byPriority,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }
}
