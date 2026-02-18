import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { spawn, ChildProcess } from "child_process";

const envPaths = [
  path.join(__dirname, "..", ".env"),
  path.join(__dirname, ".env"),
  path.join(process.resourcesPath || "", ".env"),
];
const envPath = envPaths.find((p) => existsSync(p));
dotenv.config({ path: envPath });

import { windowHelper } from "./WindowHelper";
import { registerHandlers } from "./ipcHandlers";
import { dbRequest } from "./db/DatabaseManager";
import { ThemeManager } from "./ThemeManager";
import { screenshotHelper } from "./ScreenshotHelper";

process.env.APP_ROOT = path.join(__dirname, "..");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let tray: Tray | null = null;
let backendProcess: ChildProcess | null = null;

function startBackendServer() {
  const backendScript = existsSync(
    path.join(__dirname, "..", "backend", "server.js"),
  )
    ? path.join(__dirname, "..", "backend", "server.js")
    : path.join(process.resourcesPath || "", "backend", "server.js");

  if (!existsSync(backendScript)) {
    console.error("[Main] Backend server.js not found at:", backendScript);
    return;
  }

  console.log("[Main] Starting backend server:", backendScript);

  const backendDir = path.dirname(backendScript);
  const backendNodeModules = path.join(backendDir, "node_modules");

  backendProcess = spawn(process.execPath, [backendScript], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_PATH: backendNodeModules,
    },
  });

  backendProcess.stdout?.on("data", (data: Buffer) => {
    process.stdout.write(`[Backend] ${data}`);
  });

  backendProcess.stderr?.on("data", (data: Buffer) => {
    process.stderr.write(`[Backend ERR] ${data}`);
  });

  backendProcess.on("exit", (code, signal) => {
    console.log(`[Main] Backend exited (code=${code}, signal=${signal})`);
    backendProcess = null;
  });

  backendProcess.on("error", (err) => {
    console.error("[Main] Failed to start backend:", err.message);
  });
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || "", "app-icon.png");
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Nyx",
      click: () => {
        if (
          windowHelper.launcherWindow &&
          !windowHelper.launcherWindow.isDestroyed()
        ) {
          windowHelper.launcherWindow.show();
          windowHelper.launcherWindow.focus();
        } else {
          windowHelper.createLauncher();
        }
      },
    },
    {
      label: "Toggle Overlay",
      click: () => {
        windowHelper.toggleOverlay();
      },
    },
    {
      label: "Take Screenshot",
      click: async () => {
        if (
          windowHelper.overlayWindow &&
          windowHelper.overlayWindow.isVisible()
        ) {
          try {
            const result = await screenshotHelper.takeScreenshot();
            if (result.path) {
              windowHelper.sendToOverlay("screenshot-captured", result);
            }
          } catch (e) {
            console.error("Tray screenshot error:", e);
          }
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Nyx");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (
      windowHelper.launcherWindow &&
      !windowHelper.launcherWindow.isDestroyed()
    ) {
      windowHelper.launcherWindow.show();
      windowHelper.launcherWindow.focus();
    } else {
      windowHelper.createLauncher();
    }
  });
}

app.on("window-all-closed", () => {});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowHelper.createLauncher();
  }
});

app.whenReady().then(() => {
  startBackendServer();
  dbRequest.init();
  ThemeManager.getInstance();
  registerHandlers();
  windowHelper.createLauncher();
  createTray();
});

app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
  }
  if (backendProcess) {
    console.log("[Main] Killing backend server...");
    backendProcess.kill();
    backendProcess = null;
  }
});
