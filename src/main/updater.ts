import { app, net } from 'electron';
import type { UpdateCheckResult } from '../shared/types';

function compareVersions(current: string, latest: string): boolean {
  const currentParts = current.replace(/^v/, '').split('.').map(Number);
  const latestParts = latest.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion();
  const TIMEOUT_MS = 10000;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      request.abort();
      reject(new Error('更新の確認がタイムアウトしました'));
    }, TIMEOUT_MS);

    const request = net.request({
      method: 'GET',
      url: 'https://api.github.com/repos/Developlayer/wmv-converter/releases/latest',
    });

    request.setHeader('Accept', 'application/vnd.github.v3+json');
    request.setHeader('User-Agent', `WMV-Converter/${currentVersion}`);

    let responseData = '';

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        clearTimeout(timer);
        reject(new Error(`GitHub API returned status ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      response.on('end', () => {
        clearTimeout(timer);
        try {
          const release = JSON.parse(responseData);
          const latestVersion = release.tag_name || '';
          const releaseUrl = release.html_url || 'https://github.com/Developlayer/wmv-converter/releases/latest';

          resolve({
            hasUpdate: compareVersions(currentVersion, latestVersion),
            currentVersion,
            latestVersion: latestVersion.replace(/^v/, ''),
            releaseUrl,
          });
        } catch {
          reject(new Error('GitHub APIのレスポンスの解析に失敗しました'));
        }
      });

      response.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    request.on('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });

    request.end();
  });
}
