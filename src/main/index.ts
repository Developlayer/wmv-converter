import { app, BrowserWindow, dialog, shell } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipc';
import { checkForUpdates } from './updater';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // __dirname は dist/main/main/ を指す
  // preload.js は同じディレクトリにある
  const preloadPath = path.join(__dirname, 'preload.js');

  // レンダラーのHTMLは dist/renderer/index.html
  // __dirname (dist/main/main/) から見ると ../../renderer/index.html
  const htmlPath = path.join(__dirname, '../../renderer/index.html');

  mainWindow = new BrowserWindow({
    width: 800,
    height: 850,
    minWidth: 600,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,  // preloadスクリプトでNode.js機能を使用するため
      preload: preloadPath,
    },
    titleBarStyle: 'default',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

  // 起動後にバックグラウンドでアップデートチェック
  setTimeout(async () => {
    try {
      const result = await checkForUpdates();
      if (result.hasUpdate && mainWindow) {
        const response = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'アップデートのお知らせ',
          message: `新しいバージョン v${result.latestVersion} が利用可能です（現在 v${result.currentVersion}）`,
          buttons: ['ダウンロードページを開く', '後で'],
          defaultId: 0,
          cancelId: 1,
        });
        if (response.response === 0) {
          shell.openExternal(result.releaseUrl);
        }
      }
    } catch {
      // ネットワークエラー等はサイレントに無視
    }
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { mainWindow };
