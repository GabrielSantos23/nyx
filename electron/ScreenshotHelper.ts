import { desktopCapturer, screen, BrowserWindow, app, clipboard } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as uuid from "uuid";

const execAsync = promisify(exec);

export interface ScreenshotResult {
  path: string;
  preview: string;
}

export class ScreenshotHelper {
  private screenshotDir: string;

  constructor() {
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots");
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async takeScreenshot(): Promise<ScreenshotResult> {
    const filename = `${uuid.v4()}.png`;
    const filePath = path.join(this.screenshotDir, filename);

    const win = BrowserWindow.getFocusedWindow();
    const wasVisible = win?.isVisible() ?? false;
    if (win && wasVisible) {
      win.hide();
    }

    await new Promise((r) => setTimeout(r, 100));

    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      if (sources.length === 0) {
        throw new Error("No screen found");
      }

      const primaryDisplay = screen.getPrimaryDisplay();
      const source =
        sources.find((s) => s.display_id === String(primaryDisplay.id)) ||
        sources[0];

      const pngBuffer = source.thumbnail.toPNG();
      fs.writeFileSync(filePath, pngBuffer);

      const preview = this.getPreview(pngBuffer);

      return { path: filePath, preview };
    } finally {
      if (win && wasVisible) {
        win.show();
      }
    }
  }

  async takeSelectiveScreenshot(): Promise<ScreenshotResult> {
    const filename = `${uuid.v4()}.png`;
    const filePath = path.join(this.screenshotDir, filename);

    const win = BrowserWindow.getFocusedWindow();
    const wasVisible = win?.isVisible() ?? false;
    if (win && wasVisible) {
      win.hide();
    }

    await new Promise((r) => setTimeout(r, 100));

    try {
      if (process.platform === "darwin") {
        await execAsync(`screencapture -i -x "${filePath}"`);
      } else if (process.platform === "win32") {
        const { spawn } = require("child_process");
        
        clipboard.clear();
        
        await new Promise<void>((resolve) => {
          const ps = spawn("powershell.exe", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            `Add-Type -AssemblyName System.Windows.Forms; [Windows.Forms.SendKeys]::SendWait('+(%{PRTSC})')`,
          ]);
          
          ps.on("close", () => resolve());
          setTimeout(() => resolve(), 1000);
        });
        
        await new Promise((r) => setTimeout(r, 2000));
        
        const image = clipboard.readImage();
        if (image.isEmpty()) {
          throw new Error("Screenshot cancelled or failed");
        }
        
        const pngBuffer = image.toPNG();
        fs.writeFileSync(filePath, pngBuffer);
      } else {
        await execAsync(`gnome-screenshot -a -f "${filePath}"`);
      }

      if (!fs.existsSync(filePath)) {
        throw new Error("Screenshot cancelled or failed");
      }

      const pngBuffer = fs.readFileSync(filePath);
      const preview = this.getPreview(pngBuffer);

      return { path: filePath, preview };
    } finally {
      if (win && wasVisible) {
        win.show();
      }
    }
  }

  private getPreview(buffer: Buffer): string {
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }

  async deleteScreenshot(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async captureScreen(displayId: string): Promise<Buffer> {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    const source =
      sources.find((s) => s.display_id === displayId) || sources[0];
    if (!source) throw new Error("No screen found");
    return source.thumbnail.toPNG();
  }
}

export const screenshotHelper = new ScreenshotHelper();
