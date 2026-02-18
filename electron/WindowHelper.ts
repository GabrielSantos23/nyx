import { BrowserWindow, screen, app } from "electron";
import path from "path";

import { ThemeManager } from "./ThemeManager";

export class WindowHelper {
  public launcherWindow: BrowserWindow | null = null;
  public overlayWindow: BrowserWindow | null = null;
  private isUndetectable: boolean = false;
  private overlayPosition: { x: number; y: number } | null = null;

  public createLauncher(): BrowserWindow {
    const themeManager = ThemeManager.getInstance();
    const resolvedTheme = themeManager.getResolvedTheme();

    this.launcherWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1200,
      minHeight: 800,
      frame: false,
      titleBarStyle: "hidden",
      icon: path.join(process.env.VITE_PUBLIC || "", "app-icon.png"),

      titleBarOverlay: {
        color: resolvedTheme === "light" ? "#ebe7e0" : "#050505",
        symbolColor: resolvedTheme === "light" ? "#000000" : "#ffffff",
        height: 32,
      },
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const url = process.env.VITE_DEV_SERVER_URL
      ? `${process.env.VITE_DEV_SERVER_URL}#/launcher`
      : `file://${path.join(__dirname, "../dist/index.html")}#/launcher`;

    this.launcherWindow.loadURL(url);

    if (
      process.env.NODE_ENV === "development" ||
      process.env.VITE_DEV_SERVER_URL
    ) {
      this.launcherWindow.webContents.openDevTools();
    }

    return this.launcherWindow;
  }

  public toggleDevTools(window: "launcher" | "overlay" = "launcher"): void {
    const targetWindow =
      window === "launcher" ? this.launcherWindow : this.overlayWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      if (targetWindow.webContents.isDevToolsOpened()) {
        targetWindow.webContents.closeDevTools();
      } else {
        targetWindow.webContents.openDevTools();
      }
    }
  }

  public createOverlay(): BrowserWindow {
    this.overlayWindow = new BrowserWindow({
      width: 600,
      height: 1,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const url = process.env.VITE_DEV_SERVER_URL
      ? `${process.env.VITE_DEV_SERVER_URL}#/overlay`
      : `file://${path.join(__dirname, "../dist/index.html")}#/overlay`;
    this.overlayWindow.loadURL(url);

    return this.overlayWindow;
  }

  public setOverlayDimensions(width: number, height: number): void {
    if (!this.overlayWindow) return;

    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;

    const clampedWidth = Math.min(width, screenWidth - 20);
    const clampedHeight = Math.min(height, screenHeight - 20);

    this.overlayWindow.setContentSize(clampedWidth, clampedHeight);
  }

  public showOverlay(): void {
    if (!this.overlayWindow) {
      this.createOverlay();
    } else {
      this.overlayWindow.show();
    }
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.webContents.send("overlay-visibility-changed", true);
    }
  }

  public hideOverlay(): void {
    if (this.overlayWindow) {
      this.overlayWindow.hide();
    }
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.webContents.send("overlay-visibility-changed", false);
    }
  }

  public toggleOverlay() {
    if (!this.overlayWindow) {
      this.createOverlay();
    } else {
      if (this.overlayWindow.isVisible()) {
        this.overlayWindow.hide();
        if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
          this.launcherWindow.webContents.send(
            "overlay-visibility-changed",
            false,
          );
        }
      } else {
        this.overlayWindow.show();
        if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
          this.launcherWindow.webContents.send(
            "overlay-visibility-changed",
            true,
          );
        }
      }
    }
  }

  public isOverlayVisible(): boolean {
    return this.overlayWindow ? this.overlayWindow.isVisible() : false;
  }

  public sendToOverlay(channel: string, data: any): void {
    if (this.overlayWindow) {
      this.overlayWindow.webContents.send(channel, data);
    }
  }

  public setTitleBarOverlay(options: {
    color?: string;
    symbolColor?: string;
  }): void {
    if (this.launcherWindow) {
      this.launcherWindow.setTitleBarOverlay(options);
    }
  }

  public setContentProtection(enable: boolean): void {
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.setContentProtection(enable);
    }
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.setContentProtection(enable);
    }
    console.log(`[WindowHelper] Content Protection set to: ${enable}`);
  }

  public setUndetectable(state: boolean): void {
    this.isUndetectable = state;
    this.setContentProtection(state);

    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.webContents.send("undetectable-changed", state);
    }

    if (process.platform === "darwin") {
      if (state) {
        app.dock?.hide();
      } else {
        app.dock?.show();
      }
    }
  }

  public getUndetectable(): boolean {
    return this.isUndetectable;
  }

  public centerOverlay(): void {
    if (!this.overlayWindow) return;

    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;
    const [windowWidth, windowHeight] = this.overlayWindow.getSize();

    const x = Math.round((screenWidth - windowWidth) / 2);
    const y = Math.round((screenHeight - windowHeight) / 2);

    this.overlayWindow.setPosition(x, y);
    this.overlayPosition = { x, y };
  }

  public moveOverlay(direction: "up" | "down" | "left" | "right"): void {
    if (!this.overlayWindow) return;

    if (!this.overlayPosition) {
      const [x, y] = this.overlayWindow.getPosition();
      this.overlayPosition = { x, y };
    }

    const step = 20;

    switch (direction) {
      case "up":
        this.overlayPosition.y -= step;
        break;
      case "down":
        this.overlayPosition.y += step;
        break;
      case "left":
        this.overlayPosition.x -= step;
        break;
      case "right":
        this.overlayPosition.x += step;
        break;
    }

    this.overlayWindow.setPosition(
      this.overlayPosition.x,
      this.overlayPosition.y,
    );
  }
}

export const windowHelper = new WindowHelper();
