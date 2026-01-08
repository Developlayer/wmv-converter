import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type { ConversionSettings, FileInfo, ConversionResult } from '../shared/types';

// 変換状態を管理するクラス
class ConversionManager {
  private currentProcess: ChildProcess | null = null;
  private isCancelled = false;
  private isConverting = false;

  // 現在のプロセスを設定
  setProcess(proc: ChildProcess | null): void {
    this.currentProcess = proc;
  }

  // 変換開始時の初期化
  startConversion(): void {
    this.isCancelled = false;
    this.isConverting = true;
  }

  // 変換終了
  endConversion(): void {
    this.currentProcess = null;
    this.isConverting = false;
  }

  // キャンセルされたかどうか
  get cancelled(): boolean {
    return this.isCancelled;
  }

  // 変換中かどうか
  get converting(): boolean {
    return this.isConverting;
  }

  // キャンセル実行
  cancel(): void {
    this.isCancelled = true;
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
    }
  }
}

const conversionManager = new ConversionManager();
let ffmpegChecked = false;

// ffmpegバイナリのパスを取得
function getFFmpegPath(): string {
  const isDev = !app.isPackaged;
  const platform = process.platform;

  let ffmpegName: string;

  if (platform === 'win32') {
    ffmpegName = 'ffmpeg-win.exe';
  } else if (platform === 'darwin') {
    // macOSではIntel版を使用（Apple SiliconではRosetta 2経由で実行）
    ffmpegName = 'ffmpeg-mac';
  } else {
    throw new Error('サポートされていないプラットフォームです');
  }

  if (isDev) {
    return path.join(process.cwd(), 'resources', ffmpegName);
  } else {
    return path.join(process.resourcesPath, ffmpegName);
  }
}

// ffmpegバイナリの存在と実行権限を確認
function ensureFFmpegExecutable(): void {
  if (ffmpegChecked) return;

  const ffmpegPath = getFFmpegPath();

  // ファイルの存在確認
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`ffmpegバイナリが見つかりません: ${ffmpegPath}`);
  }

  // macOSの場合、実行権限を確認・設定
  if (process.platform === 'darwin') {
    try {
      const stats = fs.statSync(ffmpegPath);
      const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;

      if (!isExecutable) {
        // 実行権限を付与 (chmod +x)
        fs.chmodSync(ffmpegPath, stats.mode | fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH);
        console.log('ffmpegに実行権限を付与しました');
      }
    } catch (error) {
      console.error('ffmpegの実行権限設定に失敗しました:', error);
      throw new Error('ffmpegの実行権限を設定できませんでした。アプリを再インストールしてください。');
    }
  }

  ffmpegChecked = true;
}

// 出力ファイルパスを生成
function generateOutputPath(inputPath: string, outputDir: string): string {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  let outputPath = path.join(outputDir, `${baseName}.wmv`);

  // 同名ファイルが存在する場合は連番を付ける
  let counter = 1;
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(outputDir, `${baseName}_${counter}.wmv`);
    counter++;
  }

  return outputPath;
}

// 進捗情報のパース
interface ProgressCallback {
  percent: number;
  currentTime?: string;
  duration?: string;
}

function parseProgress(stderr: string, duration: number | null): ProgressCallback | null {
  // 時間情報を抽出 (time=00:01:23.45) - 最新のマッチを取得
  const timeMatches = stderr.matchAll(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/g);
  let lastMatch: RegExpMatchArray | null = null;

  for (const match of timeMatches) {
    lastMatch = match;
  }

  if (!lastMatch) return null;

  const hours = parseInt(lastMatch[1], 10);
  const minutes = parseInt(lastMatch[2], 10);
  const seconds = parseInt(lastMatch[3], 10);
  const centiseconds = parseInt(lastMatch[4], 10);

  const currentSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
  const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let percent = 0;
  if (duration && duration > 0) {
    percent = Math.min(100, Math.round((currentSeconds / duration) * 100));
  }

  return {
    percent,
    currentTime,
    duration: duration ? formatDuration(duration) : undefined,
  };
}

// 秒数を時間形式にフォーマット
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 動画の長さを取得
async function getVideoDuration(inputPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const ffmpegPath = getFFmpegPath();
    const proc = spawn(ffmpegPath, ['-i', inputPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      // Duration: 00:01:23.45
      const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const centiseconds = parseInt(match[4], 10);
        resolve(hours * 3600 + minutes * 60 + seconds + centiseconds / 100);
      } else {
        resolve(null);
      }
    });
  });
}

// WMVに変換
export async function convertToWmv(
  file: FileInfo,
  outputDir: string,
  settings: ConversionSettings,
  onProgress: (progress: ProgressCallback) => void
): Promise<ConversionResult> {
  // 変換状態を初期化
  conversionManager.startConversion();

  // ffmpegの存在と実行権限を確認
  ensureFFmpegExecutable();

  const ffmpegPath = getFFmpegPath();
  const outputPath = generateOutputPath(file.path, outputDir);

  // 動画の長さを取得
  const duration = await getVideoDuration(file.path);

  // ffmpegコマンドの引数を構築（仕様書6章参照）
  const args = [
    '-i', file.path,
    '-c:v', settings.videoCodec,  // ユーザーが選択したコーデック（wmv1 or wmv2）
    '-b:v', `${settings.videoBitrate}M`,
    '-s', settings.resolution,
    '-r', String(settings.frameRate),
    '-c:a', 'wmav2',
    '-b:a', `${settings.audioBitrate}k`,
    '-y', // 上書き確認なし
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    conversionManager.setProcess(proc);

    let stderrBuffer = '';

    proc.stderr?.on('data', (data) => {
      stderrBuffer += data.toString();

      // 進捗をパース
      const progress = parseProgress(stderrBuffer, duration);
      if (progress) {
        onProgress(progress);
      }
    });

    proc.on('close', (code) => {
      conversionManager.endConversion();

      if (conversionManager.cancelled) {
        // キャンセルされた場合、出力ファイルを削除
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error('変換がキャンセルされました'));
        return;
      }

      if (code === 0) {
        resolve({
          success: true,
          inputPath: file.path,
          outputPath,
        });
      } else {
        // 失敗時は出力ファイルを削除
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error(`変換に失敗しました (終了コード: ${code})`));
      }
    });

    proc.on('error', (error) => {
      conversionManager.endConversion();
      reject(error);
    });
  });
}

// 変換をキャンセル
export function cancelConversion(): void {
  conversionManager.cancel();
}
