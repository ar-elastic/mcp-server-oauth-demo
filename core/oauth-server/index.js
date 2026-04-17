import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

/**
 * ---------------------------
 * PATH FIX (IMPORTANT)
 * ---------------------------
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_FILE = path.join(__dirname, "../shared/session.json");

/**
 * ---------------------------
 * ENV
 * ---------------------------
 */
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

/**
 * ---------------------------
 * LOGIN
 * ---------------------------
 */
app.get("/login", (req, res) => {
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("email profile")}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.redirect(url);
});

/**
 * ---------------------------
 * CALLBACK
 * ---------------------------
 */
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing code");
  }

  try {
    /**
     * Exchange code → access token
     */
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const access_token = tokenRes.data.access_token;

    /**
     * Fetch user info
     */
    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const user = userRes.data;

    /**
     * WRITE SESSION FILE
     */
    console.log("Writing session to:", SESSION_FILE);

    fs.writeFileSync(
      SESSION_FILE,
      JSON.stringify(
        {
          access_token,
          user,
          updatedAt: Date.now(),
        },
        null,
        2
      )
    );

    res.send(`
      <h2>Login successful</h2>
      <p>You can now return to Claude and use MCP tools.</p>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth failed");
  }
});

/**
 * ---------------------------
 * START
 * ---------------------------
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`OAuth server running on http://localhost:${PORT}`);
});