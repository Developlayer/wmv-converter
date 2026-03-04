import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type { ConversionSettings, FileInfo, ConversionResult, ProbeResult } from '../shared/types';

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

// 入力ファイルをプローブ（事前分析）
export async function probeFile(filePath: string): Promise<ProbeResult> {
  ensureFFmpegExecutable();
  const ffmpegPath = getFFmpegPath();

  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', filePath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      const warnings: string[] = [];

      // Duration
      let duration: number | null = null;
      const durationMatch = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10) * 3600
          + parseInt(durationMatch[2], 10) * 60
          + parseInt(durationMatch[3], 10)
          + parseInt(durationMatch[4], 10) / 100;
      }

      // 映像ストリーム情報
      let videoCodec = '';
      let pixelFormat = '';
      let width = 0;
      let height = 0;
      const videoMatch = stderr.match(/Stream\s+#\d+:\d+.*Video:\s+(\w+).*?,\s+(\w+).*?,\s+(\d+)x(\d+)/);
      if (videoMatch) {
        videoCodec = videoMatch[1];
        pixelFormat = videoMatch[2];
        width = parseInt(videoMatch[3], 10);
        height = parseInt(videoMatch[4], 10);
      }

      // 音声ストリーム情報
      let hasAudio = false;
      let audioChannels = 0;
      const audioMatch = stderr.match(/Stream\s+#\d+:\d+.*Audio:\s+\w+.*?,\s+\d+\s+Hz,\s+([^,]+)/);
      if (audioMatch) {
        hasAudio = true;
        const channelStr = audioMatch[1].trim();
        if (channelStr === 'mono') {
          audioChannels = 1;
        } else if (channelStr === 'stereo') {
          audioChannels = 2;
        } else {
          // "5.1", "7.1", "4.0" 等
          const chMatch = channelStr.match(/(\d+)\.?(\d*)/);
          if (chMatch) {
            audioChannels = parseInt(chMatch[1], 10) + (chMatch[2] ? parseInt(chMatch[2], 10) : 0);
          } else {
            audioChannels = 2;
          }
        }
      }

      // 回転メタデータ
      let rotation = 0;
      const rotationMatch = stderr.match(/rotate\s*:\s*(\d+)/);
      if (rotationMatch) {
        rotation = parseInt(rotationMatch[1], 10);
      }
      // displaymatrixによる回転検出
      const displayMatrixMatch = stderr.match(/displaymatrix:\s*rotation of\s*(-?\d+\.?\d*)\s*degrees/);
      if (displayMatrixMatch) {
        rotation = Math.abs(parseFloat(displayMatrixMatch[1]));
      }

      // 警告を生成
      if (!hasAudio) {
        warnings.push('音声トラックがありません（映像のみ変換されます）');
      }
      if (rotation !== 0 && rotation !== 360) {
        warnings.push(`この動画は${rotation}度回転しています。変換後、映像が引き伸ばされる可能性があります`);
      }
      if (pixelFormat && (pixelFormat.includes('10') || pixelFormat.includes('12'))) {
        warnings.push('HDR/10bit動画です。8bitに変換されます');
      }

      resolve({
        hasAudio,
        audioChannels,
        rotation,
        videoCodec,
        pixelFormat,
        duration,
        width,
        height,
        warnings,
      });
    });
  });
}

// ディスク空き容量を確認（バイト単位で返す）
export async function checkDiskSpace(dirPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      const drive = path.parse(dirPath).root;
      const proc = spawn('wmic', ['logicaldisk', 'where', `DeviceID='${drive.replace('\\', '')}'`, 'get', 'FreeSpace', '/format:value'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.on('close', () => {
        const match = stdout.match(/FreeSpace=(\d+)/);
        resolve(match ? parseInt(match[1], 10) : 0);
      });
      proc.on('error', () => resolve(0));
    } else {
      const proc = spawn('df', ['-k', dirPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.on('close', () => {
        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          // df -k の4番目のカラムがAvailable（KB単位）
          const availableKB = parseInt(parts[3], 10);
          resolve(availableKB * 1024);
        } else {
          resolve(0);
        }
      });
      proc.on('error', () => resolve(0));
    }
  });
}

// 出力先の書き込み権限を確認
export function checkWritePermission(dirPath: string): boolean {
  try {
    const testFile = path.join(dirPath, `.wmv-converter-write-test-${Date.now()}`);
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

// ファイルパスのバリデーション
export function validateFilePath(filePath: string): string | null {
  if (process.platform === 'win32' && filePath.length > 260) {
    return 'ファイルパスが長すぎます（260文字以内にしてください）';
  }
  if (!fs.existsSync(filePath)) {
    return 'ファイルが見つかりません';
  }
  return null;
}

// ffmpegのstderrからエラーメッセージをパース
function parseFFmpegError(stderr: string): string {
  // よくあるエラーパターンを検出
  if (stderr.includes('too many channels')) {
    return '音声チャンネル数が非対応です';
  }
  if (stderr.includes('No such file or directory')) {
    return '入力ファイルが見つかりません';
  }
  if (stderr.includes('Permission denied')) {
    return '書き込み権限がありません';
  }
  if (stderr.includes('No space left on device')) {
    return 'ディスク容量が不足しています';
  }
  if (stderr.includes('Invalid data found') || stderr.includes('corrupt')) {
    return 'ファイルが破損している可能性があります';
  }
  if (stderr.includes('moov atom not found')) {
    return 'ファイルが不完全です（ダウンロードや録画が中断された可能性があります）';
  }
  if (stderr.includes('Decoder') && stderr.includes('not found')) {
    return 'この動画形式には対応していません';
  }
  if (stderr.includes('Invalid argument')) {
    return '入力ファイルの形式に問題があります';
  }
  if (stderr.includes('does not contain any stream')) {
    return '有効なストリームが見つかりません';
  }
  return '変換に失敗しました。入力ファイルを確認してください';
}

// 推定出力ファイルサイズを計算（バイト単位）
export function estimateOutputSize(duration: number | null, videoBitrateMbps: number, audioBitrateKbps: number): number {
  if (!duration) return 0;
  const videoBitsPerSecond = videoBitrateMbps * 1000 * 1000;
  const audioBitsPerSecond = audioBitrateKbps * 1000;
  return Math.ceil(((videoBitsPerSecond + audioBitsPerSecond) * duration) / 8);
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

  // パスバリデーション
  const pathError = validateFilePath(file.path);
  if (pathError) {
    conversionManager.endConversion();
    throw new Error(pathError);
  }

  // 書き込み権限チェック
  if (!checkWritePermission(outputDir)) {
    conversionManager.endConversion();
    throw new Error('出力先フォルダへの書き込み権限がありません');
  }

  const ffmpegPath = getFFmpegPath();
  const outputPath = generateOutputPath(file.path, outputDir);

  // 入力ファイルをプローブ
  const probe = await probeFile(file.path);

  // ディスク容量チェック
  const estimatedSize = estimateOutputSize(probe.duration, settings.videoBitrate, settings.audioBitrate);
  if (estimatedSize > 0) {
    const freeSpace = await checkDiskSpace(outputDir);
    if (freeSpace > 0 && estimatedSize > freeSpace) {
      conversionManager.endConversion();
      const estimatedMB = Math.ceil(estimatedSize / (1024 * 1024));
      const freeMB = Math.ceil(freeSpace / (1024 * 1024));
      throw new Error(`ディスク容量が不足しています（必要: 約${estimatedMB}MB / 空き: ${freeMB}MB）`);
    }
  }

  // ffmpegコマンドの引数を構築
  const args: string[] = [
    '-i', file.path,
    '-map', '0:v:0',  // 最初の映像ストリームを選択
  ];

  // 音声ストリームがある場合のみ音声マッピングを追加
  if (probe.hasAudio) {
    args.push('-map', '0:a:0');  // 最初の音声ストリームを選択
  }

  // 映像設定
  args.push(
    '-c:v', settings.videoCodec,
    '-b:v', `${settings.videoBitrate}M`,
    '-s', settings.resolution,
    '-r', String(settings.frameRate),
    '-pix_fmt', 'yuv420p',  // 10bit/HDR/alpha対策: 8bitに統一
    '-vsync', 'cfr',        // VFR対策: 固定フレームレートに変換
  );

  // 音声設定（音声ストリームがある場合のみ）
  if (probe.hasAudio) {
    args.push(
      '-c:a', 'wmav2',
      '-ac', '2',                          // チャンネル数超過対策: ステレオに統一
      '-ar', '48000',                      // 非標準サンプルレート対策: 48kHzに統一
      '-b:a', `${settings.audioBitrate}k`,
    );
  }

  args.push(
    '-y', // 上書き確認なし
    outputPath,
  );

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    conversionManager.setProcess(proc);

    let stderrBuffer = '';

    proc.stderr?.on('data', (data) => {
      stderrBuffer += data.toString();

      // 進捗をパース
      const progress = parseProgress(stderrBuffer, probe.duration);
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
        // stderrからわかりやすいエラーメッセージを生成
        const errorMessage = parseFFmpegError(stderrBuffer);
        reject(new Error(errorMessage));
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
