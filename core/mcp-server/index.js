import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * ---------------------------
 * PATH SETUP
 * ---------------------------
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_FILE = path.join(__dirname, "../shared/session.json");

/**
 * ---------------------------
 * SESSION LOADER
 * ---------------------------
 */
function getSession() {
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * ---------------------------
 * SAFE LOGGING (IMPORTANT)
 * ---------------------------
 * MCP uses stdout for protocol ONLY.
 * So we log ONLY to stderr.
 */
function log(...args) {
  console.error("[MCP DEBUG]", ...args);
}

/**
 * ---------------------------
 * MCP SERVER
 * ---------------------------
 */
const server = new Server(
  {
    name: "demo-tools",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  }
);

/**
 * ---------------------------
 * LIST TOOLS
 * ---------------------------
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_numbers",
        description:
          "Add two numbers using authenticated Google OAuth session",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "get_time",
        description: "Get time from Rust API",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

/**
 * ---------------------------
 * TOOL HANDLER
 * ---------------------------
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const session = getSession();

  // 🔐 debug (SAFE)
  log("SESSION:", session);

  if (!session?.access_token) {
    return {
      content: [
        {
          type: "text",
          text: "❌ Not logged in. Go to http://localhost:5000/login",
        },
      ],
    };
  }

  const user = session.user;

  /**
   * ---------------------------
   * TOOL: ADD NUMBERS
   * ---------------------------
   */
  if (name === "add_numbers") {
    const result = args.a + args.b;

    log("TOOL EXECUTION:", {
      tool: name,
      args,
      user,
      result,
    });

    return {
      content: [
        {
          type: "text",
          text: `Result: ${result}\nUser: ${user?.email || "unknown"}`,
        },
      ],
    };
  }

  /**
   * ---------------------------
   * TOOL: GET TIME
   * ---------------------------
   */
  if (name === "get_time") {
    const res = await axios.post("http://localhost:4000/tool/time");

    return {
      content: [
        {
          type: "text",
          text: `Time: ${JSON.stringify(res.data)}\nUser: ${
            user?.email || "unknown"
          }`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`,
      },
    ],
  };
});

/**
 * ---------------------------
 * START MCP (STDIO)
 * ---------------------------
 */
const transport = new StdioServerTransport();
await server.connect(transport);

log("🚀 MCP server running: demo-tools");