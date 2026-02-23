# Project Tracker MCP Server

A Model Context Protocol (MCP) server for project task tracking, built with TypeScript. This is the companion repository for the [CrashBytes tutorial on building MCP servers](https://crashbytes.com/articles/building-mcp-server-typescript-complete-tutorial-2026).

## Features

- **4 Tools**: Create, list, update tasks, and get project statistics
- **2 Resources**: Browse all tasks or individual task details via URI templates
- **2 Prompts**: Daily standup reports and sprint planning analysis

## Quick Start

```bash
git clone https://github.com/CrashBytes/project-tracker-mcp.git
cd project-tracker-mcp
npm install
npm run build
```

## Test with MCP Inspector

```bash
npm run inspect
```

Opens a browser UI at `http://localhost:6274` where you can interact with all tools, resources, and prompts.

## Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "project-tracker": {
      "command": "node",
      "args": ["/absolute/path/to/project-tracker-mcp/build/index.js"]
    }
  }
}
```

Restart Claude Desktop after saving.

## Connect to VS Code

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "project-tracker": {
      "command": "node",
      "args": ["/absolute/path/to/project-tracker-mcp/build/index.js"]
    }
  }
}
```

## Connect to Cursor

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "project-tracker": {
      "command": "node",
      "args": ["/absolute/path/to/project-tracker-mcp/build/index.js"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `create-task` | Create a new task with title, description, priority, status, assignee, and tags |
| `list-tasks` | List tasks with optional filtering by status, priority, or assignee |
| `update-task` | Update an existing task's fields |
| `get-project-stats` | Get summary statistics including counts by status and priority |

## Resources

| URI | Description |
|-----|-------------|
| `project://tasks` | Complete list of all tasks as JSON |
| `project://tasks/{taskId}` | Individual task details by ID |

## Prompts

| Prompt | Description |
|--------|-------------|
| `daily-standup` | Generate a standup report from current tasks |
| `sprint-planning` | Analyze backlog and suggest sprint priorities |

## License

MIT
