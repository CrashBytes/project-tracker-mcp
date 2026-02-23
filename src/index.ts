#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TaskStore } from "./store.js";

const store = new TaskStore();

const server = new McpServer({
  name: "project-tracker",
  version: "1.0.0",
});

// === TOOLS ===

server.tool(
  "create-task",
  "Create a new task in the project tracker",
  {
    title: z.string().min(1).max(200).describe("Task title"),
    description: z
      .string()
      .max(2000)
      .default("")
      .describe("Detailed task description"),
    priority: z
      .enum(["low", "medium", "high", "critical"])
      .default("medium")
      .describe("Task priority level"),
    status: z
      .enum(["backlog", "todo", "in-progress", "review", "done"])
      .default("todo")
      .describe("Initial task status"),
    assignee: z
      .string()
      .optional()
      .describe("Person assigned to this task"),
    tags: z
      .array(z.string())
      .default([])
      .describe("Tags for categorization"),
  },
  async ({ title, description, priority, status, assignee, tags }) => {
    const task = store.create({
      title,
      description,
      priority,
      status,
      assignee,
      tags,
    });

    return {
      content: [
        {
          type: "text",
          text: `Task created successfully.\n\nID: ${task.id}\nTitle: ${task.title}\nPriority: ${task.priority}\nStatus: ${task.status}${task.assignee ? `\nAssignee: ${task.assignee}` : ""}\nCreated: ${task.createdAt}`,
        },
      ],
    };
  }
);

server.tool(
  "list-tasks",
  "List tasks with optional filtering by status, priority, or assignee",
  {
    status: z
      .enum(["backlog", "todo", "in-progress", "review", "done"])
      .optional()
      .describe("Filter by task status"),
    priority: z
      .enum(["low", "medium", "high", "critical"])
      .optional()
      .describe("Filter by priority level"),
    assignee: z
      .string()
      .optional()
      .describe("Filter by assigned person"),
  },
  async ({ status, priority, assignee }) => {
    const tasks = store.list({ status, priority, assignee });

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No tasks found matching the specified filters.",
          },
        ],
      };
    }

    const taskList = tasks
      .map(
        (t) =>
          `[${t.id}] ${t.title}\n    Status: ${t.status} | Priority: ${t.priority}${t.assignee ? ` | Assignee: ${t.assignee}` : ""}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${tasks.length} task${tasks.length === 1 ? "" : "s"}:\n\n${taskList}`,
        },
      ],
    };
  }
);

server.tool(
  "update-task",
  "Update an existing task's status, priority, assignee, or other fields",
  {
    id: z.string().describe("Task ID to update"),
    title: z.string().optional().describe("New task title"),
    description: z.string().optional().describe("New description"),
    status: z
      .enum(["backlog", "todo", "in-progress", "review", "done"])
      .optional()
      .describe("New status"),
    priority: z
      .enum(["low", "medium", "high", "critical"])
      .optional()
      .describe("New priority"),
    assignee: z.string().optional().describe("New assignee"),
  },
  async ({ id, ...updates }) => {
    const task = store.update(id, updates);

    if (!task) {
      return {
        content: [
          {
            type: "text",
            text: `Task with ID "${id}" not found.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Task ${task.id} updated.\n\nTitle: ${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}\nUpdated: ${task.updatedAt}`,
        },
      ],
    };
  }
);

server.tool(
  "get-project-stats",
  "Get summary statistics about the project including task counts by status and priority",
  {},
  async () => {
    const stats = store.getStats();

    const statusBreakdown = Object.entries(stats.byStatus)
      .map(([status, count]) => `  ${status}: ${count}`)
      .join("\n");

    const priorityBreakdown = Object.entries(stats.byPriority)
      .map(([priority, count]) => `  ${priority}: ${count}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Project Statistics\n\nTotal Tasks: ${stats.total}\nCompletion Rate: ${stats.completionRate}%\n\nBy Status:\n${statusBreakdown || "  No tasks yet"}\n\nBy Priority:\n${priorityBreakdown || "  No tasks yet"}`,
        },
      ],
    };
  }
);

// === RESOURCES ===

server.resource(
  "all-tasks",
  "project://tasks",
  {
    description: "Complete list of all tasks in the project",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(store.list(), null, 2),
      },
    ],
  })
);

server.resource(
  "task-by-id",
  new ResourceTemplate("project://tasks/{taskId}", {
    list: async () => ({
      resources: store.list().map((t) => ({
        uri: `project://tasks/${t.id}`,
        name: t.title,
        description: `${t.status} | ${t.priority} priority`,
      })),
    }),
  }),
  {
    description: "Individual task details by ID",
    mimeType: "application/json",
  },
  async (uri, { taskId }) => {
    const task = store.get(taskId as string);

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            task || { error: "Task not found" },
            null,
            2
          ),
        },
      ],
    };
  }
);

// === PROMPTS ===

server.prompt(
  "daily-standup",
  "Generate a daily standup report from current tasks",
  {
    assignee: z
      .string()
      .optional()
      .describe("Filter standup to a specific person"),
  },
  ({ assignee }) => {
    const tasks = store.list(assignee ? { assignee } : undefined);
    const inProgress = tasks.filter((t) => t.status === "in-progress");
    const review = tasks.filter((t) => t.status === "review");
    const done = tasks.filter(
      (t) =>
        t.status === "done" &&
        new Date(t.updatedAt).getTime() >
          Date.now() - 24 * 60 * 60 * 1000
    );

    const sections = [
      inProgress.length > 0
        ? `In Progress (${inProgress.length}):\n${inProgress.map((t) => `- ${t.title} [${t.id}]`).join("\n")}`
        : "",
      review.length > 0
        ? `In Review (${review.length}):\n${review.map((t) => `- ${t.title} [${t.id}]`).join("\n")}`
        : "",
      done.length > 0
        ? `Completed Today (${done.length}):\n${done.map((t) => `- ${t.title} [${t.id}]`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Generate a concise daily standup report based on these tasks:\n\n${sections || "No active tasks found."}\n\nFormat it as: What was completed, what is in progress, and any blockers.`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "sprint-planning",
  "Analyze the backlog and suggest sprint priorities",
  {
    sprintCapacity: z
      .string()
      .default("10")
      .describe("How many tasks can fit in the sprint"),
  },
  ({ sprintCapacity }) => {
    const allPending = [
      ...store.list({ status: "backlog" }),
      ...store.list({ status: "todo" }),
    ];

    const taskList = allPending
      .map(
        (t) =>
          `- [${t.id}] ${t.title} (Priority: ${t.priority}, Tags: ${t.tags.join(", ") || "none"})`
      )
      .join("\n");

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze these pending tasks and recommend which ${sprintCapacity} should be prioritized for the next sprint:\n\n${taskList || "No pending tasks."}\n\nConsider priority levels, dependencies between tasks, and balanced workload. Explain your reasoning.`,
          },
        },
      ],
    };
  }
);

// === START SERVER ===

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Project Tracker MCP server running on stdio");
