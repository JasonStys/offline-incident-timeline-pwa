/**
 * @file Loads styles and starts the framework-free browser application.
 * Functions: startApplication call and startup error handler.
 * Variables: none; startup state is owned by src/app.js.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import "./styles.css";
import { startApplication } from "./app.js";

void startApplication().catch((error) => {
  const status = document.getElementById("operation-status");
  if (status) {
    status.textContent = `Application startup failed: ${error instanceof Error ? error.message : "Unknown error."}`;
  }
});
