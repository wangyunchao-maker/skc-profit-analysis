/**
 * SKC 备注的本地持久化。
 * 备注保存在当前浏览器的 localStorage 中（刷新/重开浏览器仍在），
 * 并提供导出/导入 JSON，便于备份或换电脑迁移。
 */
const STORAGE_KEY = 'skc-notes-v1';

/** SKC ID -> 备注文本 */
export type SkcNotes = Record<string, string>;

/** 把任意 JSON 结构收敛为合法的备注映射 */
function normalizeNotes(parsed: unknown): SkcNotes {
  if (!parsed || typeof parsed !== 'object') return {};
  const out: SkcNotes = {};
  for (const [skc, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim() !== '') out[skc] = value;
  }
  return out;
}

export function loadNotes(): SkcNotes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeNotes(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveNotes(notes: SkcNotes): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // 存储不可用（无痕模式/超出配额）时忽略，不影响页面使用
  }
}

/** 写入或清除某个 SKC 的备注（空文本视为清除） */
export function withNote(notes: SkcNotes, skcId: string, text: string): SkcNotes {
  const next = { ...notes };
  if (text.trim() === '') delete next[skcId];
  else next[skcId] = text;
  return next;
}

/** 导出为 JSON 文件下载 */
export function downloadNotes(notes: SkcNotes): void {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SKC备注-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 解析备注 JSON 文本（格式非法时抛出，由调用方提示用户） */
export function parseNotes(text: string): SkcNotes {
  return normalizeNotes(JSON.parse(text));
}

/** 读取导入的备注文件 */
export async function readNotesFile(file: File): Promise<SkcNotes> {
  return parseNotes(await file.text());
}