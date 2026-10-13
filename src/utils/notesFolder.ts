/**
 * 备注文件夹读写（File System Access API）。
 * 仅在 Chrome / Edge 等 Chromium 浏览器 + https(或 localhost) 下可用；
 * 其他浏览器不支持时，调用方需降级为普通下载。
 */

/** 文件夹中的固定文件名，每次导出覆盖更新 */
export const NOTES_FILE_NAME = 'SKC备注.json';

interface WritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface FileHandleLike {
  createWritable(): Promise<WritableLike>;
}

export interface NotesDirectoryHandle {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
  queryPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface WindowWithDirectoryPicker {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
    id?: string;
  }) => Promise<NotesDirectoryHandle>;
}

const DB_NAME = 'skc-notes-db';
const STORE_NAME = 'handles';
const DIR_KEY = 'notesDirectory';

export function isNotesFolderSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === 'function';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 记住文件夹句柄，下次打开页面无需重新选择 */
async function rememberDirectory(handle: NotesDirectoryHandle): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, DIR_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // 记住失败不影响本次使用
  }
}

export async function loadNotesDirectory(): Promise<NotesDirectoryHandle | null> {
  try {
    const db = await openDb();
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(DIR_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return (value as NotesDirectoryHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

/** 弹出文件夹选择框；用户取消时返回 null */
export async function pickNotesDirectory(): Promise<NotesDirectoryHandle | null> {
  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ mode: 'readwrite', id: 'skc-notes-folder' });
    await rememberDirectory(handle);
    return handle;
  } catch {
    return null;
  }
}

/** 确认读写权限，必要时向用户重新申请 */
export async function ensureWritePermission(handle: NotesDirectoryHandle): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const options = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(options)) === 'granted') return true;
  return (await handle.requestPermission(options)) === 'granted';
}

/** 把备注写入文件夹中的 SKC备注.json（覆盖更新） */
export async function writeNotesToDirectory(handle: NotesDirectoryHandle, notes: unknown): Promise<void> {
  const fileHandle = await handle.getFileHandle(NOTES_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(notes, null, 2));
  await writable.close();
}

/** 读取文件夹中已有的 SKC备注.json；不存在时返回 null */
export async function readNotesFromDirectory(handle: NotesDirectoryHandle): Promise<string | null> {
  try {
    const fileHandle = await handle.getFileHandle(NOTES_FILE_NAME);
    return await (fileHandle as unknown as { getFile(): Promise<File> }).getFile().then((f) => f.text());
  } catch {
    return null;
  }
}