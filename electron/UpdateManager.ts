import { BrowserWindow, shell, app } from "electron";
import { net } from "electron";

const GITHUB_OWNER = "GabrielSantos23";
const GITHUB_REPO = "nyx";
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

export interface ReleaseInfo {
  tagName: string;
  version: string;
  htmlUrl: string;
  body: string;
  publishedAt: string;
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function broadcastToAllWindows(channel: string, ...args: any[]) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
}

class UpdateManager {
  private latestRelease: ReleaseInfo | null = null;

  getAppVersion(): string {
    return app.getVersion();
  }

  async checkForUpdates(): Promise<void> {
    broadcastToAllWindows("update-checking");

    try {
      const release = await this.fetchLatestRelease();

      if (!release) {
        broadcastToAllWindows("update-not-available");
        return;
      }

      this.latestRelease = release;
      const currentVersion = this.getAppVersion();
      const remoteVersion = release.version;

      console.log(
        `[UpdateManager] Current: ${currentVersion} | Latest: ${remoteVersion}`,
      );

      if (compareSemver(remoteVersion, currentVersion) > 0) {
        broadcastToAllWindows("update-available", release);
      } else {
        broadcastToAllWindows("update-not-available");
      }
    } catch (error: any) {
      console.error("[UpdateManager] Check failed:", error);
      broadcastToAllWindows(
        "update-error",
        error.message || "Failed to check for updates",
      );
    }
  }

  /**
   * Open the GitHub releases page in the default browser.
   * If a specific release was found, open that release page directly.
   */
  openReleasesPage(): void {
    const url = this.latestRelease?.htmlUrl || RELEASES_PAGE;
    shell.openExternal(url);
  }

  /**
   * Fetch the latest release from the GitHub API using Electron's net module
   * (which respects proxy settings).
   */
  private fetchLatestRelease(): Promise<ReleaseInfo | null> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: "GET",
        url: RELEASES_URL,
      });

      request.setHeader("User-Agent", `Nyx/${this.getAppVersion()}`);
      request.setHeader("Accept", "application/vnd.github.v3+json");

      let body = "";

      request.on("response", (response) => {
        // 404 means no releases exist yet
        if (response.statusCode === 404) {
          resolve(null);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${response.statusCode}`));
          return;
        }

        response.on("data", (chunk) => {
          body += chunk.toString();
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(body);
            const tagName: string = data.tag_name || "";
            resolve({
              tagName,
              version: tagName.replace(/^v/, ""),
              htmlUrl: data.html_url || RELEASES_PAGE,
              body: data.body || "",
              publishedAt: data.published_at || "",
            });
          } catch (e: any) {
            reject(new Error("Failed to parse GitHub API response"));
          }
        });

        response.on("error", (error) => {
          reject(error);
        });
      });

      request.on("error", (error) => {
        reject(error);
      });

      request.end();
    });
  }
}

export const updateManager = new UpdateManager();
