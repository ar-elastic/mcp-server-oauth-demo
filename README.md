# MCP Demo — Google OAuth + Claude Integration

A demonstration of how to secure a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server with Google OAuth 2.0, allowing Claude to execute tools only for authenticated users.

---

## Architecture

The project is composed of three services:

```
core/
├── oauth-server/     # Express.js — handles Google OAuth login & callback (port 5000)
├── mcp-server/       # Node.js MCP server — exposes tools to Claude (stdio)
├── tools-api/        # Rust (Axum) — lightweight backend for tool execution (port 4000)
└── shared/
    ├── session.json  # Persisted OAuth session (access token + user profile)
    └── auth-bridge.js # In-memory auth store (single-user dev mode)
```

### How it works

1. **User visits** `http://localhost:5000/login` → redirected to Google's OAuth consent screen
2. **Google redirects** back to `/callback` with an authorization code
3. **OAuth server** exchanges the code for an access token, fetches the user's profile, and writes both to `core/shared/session.json`
4. **MCP server** reads `session.json` on every tool invocation — if no valid token is present, the tool call is blocked and the user is directed to log in
5. **Tools** execute and return results tagged with the authenticated user's email

---

## Available Tools

| Tool | Description |
|------|-------------|
| `add_numbers` | Adds two numbers; requires an active OAuth session |
| `get_time` | Fetches the current UTC time from the Rust API |

---

## Prerequisites

- Node.js 18+
- Rust + Cargo (for the tools-api)
- A Google Cloud project with OAuth 2.0 credentials configured

---

## Setup

### 1. Google Cloud OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add `http://localhost:5000/callback` as an authorized redirect URI
4. Copy your Client ID and Client Secret

### 2. Configure environment variables

Create a `.env` file in the project root (or in `core/oauth-server/`):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/callback
PORT=5000
PORT_MCP=8080
PORT_RUST=4000
```

### 3. Install dependencies

```bash
# OAuth server
cd core/oauth-server && npm install

# MCP server
cd ../mcp-server && npm install
```

### 4. Build the Rust tools API

```bash
cd core/tools-api
cargo build --release
```

---

## Running the project

Open three terminal windows:

```bash
# Terminal 1 — Rust tools API
cd core/tools-api && cargo run

# Terminal 2 — OAuth server
cd core/oauth-server && node index.js

# Terminal 3 — MCP server
cd core/mcp-server && node index.js
```

---

## Authenticate

1. Open `http://localhost:5000/login` in your browser
2. Sign in with your Google account
3. On success you'll see: **"Login successful. You can now return to Claude and use MCP tools."**

---

## Connecting to Claude

Add the MCP server to your Claude Code config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "demo-tools": {
      "command": "node",
      "args": ["/path/to/mcp-demo/core/mcp-server/index.js"]
    }
  }
}
```

---

## Security notes

- `session.json` contains a live Google access token — **add it to `.gitignore`** before pushing
- `auth-bridge.js` is designed for single-user development mode only; do not use in multi-user production without proper session management
- The MCP server does not re-validate the token with Google on each call — for production use, add token expiry checks

---

## Project structure

```
mcp-demo/
├── .env                          # Environment variables (do not commit)
├── core/
│   ├── oauth-server/
│   │   ├── index.js              # Express OAuth server (login + callback)
│   │   └── package.json
│   ├── mcp-server/
│   │   ├── index.js              # MCP server with auth guard
│   │   └── package.json
│   ├── tools-api/
│   │   ├── src/main.rs           # Rust/Axum tool endpoints
│   │   └── Cargo.toml
│   └── shared/
│       ├── session.json          # Runtime session file (do not commit)
│       └── auth-bridge.js        # In-memory auth store
```

---

## License

MIT
