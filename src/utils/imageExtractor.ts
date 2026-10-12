/**
 * 从 xlsx(zip) 中抽取单元格内嵌图片，并按锚点所在行的 SKC 关联。
 * 支持两种存储格式：
 * 1. 标准 xl/drawings/drawingN.xml 锚点(xdr:row)定位。
 * 2. WPS/Excel「图片放入单元格」生成的 xl/cellimages.xml —— 无显式行号，
 *    用图片的 a:off y 纵坐标结合 sheet1 行高换算成具体行。
 */
import JSZip from 'jszip';

const DRAWING_RE = /^xl\/drawings\/drawing\d+\.xml$/;
const CELLIMAGES_PATH = 'xl/cellimages.xml';
const EMU_PER_PT = 12700;

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'gif') return 'image/gif';
  if (e === 'webp') return 'image/webp';
  if (e === 'svg') return 'image/svg+xml';
  return 'image/png';
}

/** 解析 *.xml.rels 得到 rId -> media Target */
function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    map.set(m[1], m[2]);
  }
  return map;
}

interface Anchor {
  row: number; // 0-based sheet row，锚点所在行
  rId: string;
}

function parseAnchors(xml: string): Anchor[] {
  const out: Anchor[] = [];
  const anchorRe = /<(?:xdr:twoCellAnchor|xdr:oneCellAnchor|a:graphicFrame)[\s\S]*?(?:<\/xdr:twoCellAnchor>|<\/xdr:oneCellAnchor>|<\/a:graphicFrame>)/g;
  let blk: RegExpExecArray | null;
  while ((blk = anchorRe.exec(xml))) {
    const seg = blk[0];
    const rMatch = seg.match(/r:embed="([^"]+)"/);
    if (!rMatch) continue;
    const fromMatch = seg.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
    const toMatch = seg.match(/<xdr:to>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
    const row = toMatch ? Number(toMatch[1]) : fromMatch ? Number(fromMatch[1]) : -1;
    if (row < 0) continue;
    out.push({ row, rId: rMatch[1] });
  }
  return out;
}

function resolveMediaPath(target: string): string {
  if (target.startsWith('../')) return 'xl/' + target.slice(3);
  if (target.startsWith('/')) return target.slice(1);
  if (!target.startsWith('xl/')) return 'xl/' + target;
  return target;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000; // 32768，避免参数过多导致调用栈溢出
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function toDataUrl(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  const buf = await file.async('arraybuffer');
  const ext = (path.split('.').pop() ?? 'png');
  const base64 = uint8ToBase64(new Uint8Array(buf));
  return `data:${mimeFromExt(ext)};base64,${base64}`;
}

/** 定位第一个工作表对应的 sheet xml 路径（xl/worksheets/sheetN.xml） */
async function getFirstSheetPath(zip: JSZip): Promise<string> {
  try {
    const wb = await zip.file('xl/workbook.xml')!.async('text');
    const rels = await zip.file('xl/_rels/workbook.xml.rels')!.async('text');
    const m = wb.match(/<sheet\s+[^>]*r:id="(rId\d+)"[^>]*>/);
    if (!m) return 'xl/worksheets/sheet1.xml';
    const rm = rels.match(new RegExp(`<Relationship[^>]*Id="${m[1]}"[^>]*Target="([^"]+)"`));
    if (!rm) return 'xl/worksheets/sheet1.xml';
    return resolveMediaPath(rm[1]);
  } catch {
    return 'xl/worksheets/sheet1.xml';
  }
}

interface RowInfo {
  start: number; // EMU，行顶
  end: number; // EMU，行底
  r: number; // 1-based 行号
}

/**
 * 解析第一个工作表的行高，得到每行的 EMU 起止。
 * 表头 1 行 +N 数据行：默认高度取 sheetFormatPr.defaultRowHeight（pt），单个行可用 ht（pt）覆盖。
 */
async function getRowTops(zip: JSZip, sheetPath: string): Promise<RowInfo[]> {
  const xml = await zip.file(sheetPath)!.async('text').catch(() => '');
  const fmt = xml.match(/<sheetFormatPr[^>]*defaultRowHeight="([\d.]+)"/);
  const defaultH = fmt ? parseFloat(fmt[1]) : 15;

  const heightsPt = new Map<number, number>();
  let maxRow = 0;
  const rowTags = xml.match(/<row\s[^>]*>/g) || [];
  for (const t of rowTags) {
    const rm = t.match(/r="(\d+)"/);
    if (!rm) continue;
    const r = Number(rm[1]);
    if (r > maxRow) maxRow = r;
    const hm = t.match(/ht="([\d.]+)"/);
    heightsPt.set(r, hm ? parseFloat(hm[1]) : defaultH);
  }

  const tops: RowInfo[] = [];
  let acc = 0;
  for (let r = 1; r <= maxRow; r++) {
    const h = heightsPt.get(r) ?? defaultH;
    const start = acc;
    const end = acc + h * EMU_PER_PT;
    tops.push({ start, end, r });
    acc = end;
  }
  return tops;
}

/** 用 y 坐标（EMU）找出图片所在行（匹配行顶），返回 0-based sheet 行，找不到返回 -1 */
function rowForY(tops: RowInfo[], y: number): number {
  let best = -1;
  let bestDist = Infinity;
  for (const t of tops) {
    const dist = Math.abs(t.start - y);
    if (dist < bestDist && y >= t.start - 1 && y < t.end) {
      bestDist = dist;
      best = t.r - 1;
    }
  }
  return best;
}

/** WPS/Excel cellimages.xml：a:off y + 行高 -> 行 */
async function extractFromCellImages(zip: JSZip): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const imagesFile = zip.file(CELLIMAGES_PATH);
  if (!imagesFile) return result;

  const xml = await imagesFile.async('text');
  const relsXml = await zip.file('xl/_rels/cellimages.xml.rels')!.async('text').catch(() => '');
  const rIdToMedia = parseRels(relsXml);
  const tops = await getRowTops(zip, await getFirstSheetPath(zip));
  if (tops.length === 0) return result;

  // 每个 <etc:cellImage> 一段，取其中 off y 与 r:embed
  const unitRe = /<etc:cellImage>[\s\S]*?<\/etc:cellImage>|<etc:cellImage[^>]*\/>/g;
  let blk: RegExpExecArray | null;
  while ((blk = unitRe.exec(xml))) {
    const seg = blk[0];
    const rMatch = seg.match(/r:embed="([^"]+)"/);
    const yMatch = seg.match(/<a:off\s+[^>]*y="(-?\d+)"/);
    if (!rMatch || !yMatch) continue;
    const mediaTarget = rIdToMedia.get(rMatch[1]);
    if (!mediaTarget) continue;
    const row = rowForY(tops, Number(yMatch[1]));
    if (row < 0) continue;
    const dataUrl = await toDataUrl(zip, resolveMediaPath(mediaTarget));
    if (dataUrl) result.set(row, dataUrl);
  }
  return result;
}

/**
 * 抽取第一个工作表中的内嵌图片。
 * @returns Map<sheetRow0based, dataUrl> —— sheetRow 为 xlsx 原始行号(0 起，0 是表头)
 */
export async function extractEmbeddedImages(buffer: ArrayBuffer): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return result;
  }

  // WPS/Excel 单元格图片：cellimages.xml 优先
  if (zip.file(CELLIMAGES_PATH)) {
    return await extractFromCellImages(zip);
  }

  // 标准绝对定位图片：xl/drawings/drawingN.xml
  const drawingNames = Object.keys(zip.files).filter((n) => DRAWING_RE.test(n));
  for (const drawingPath of drawingNames) {
    const relsPath = drawingPath.replace(/\.xml$/, '.xml.rels').replace(/drawings\//, 'drawings/_rels/');
    const drawingFile = zip.file(drawingPath);
    const relsFile = zip.file(relsPath);
    if (!drawingFile) continue;

    const drawingXml = await drawingFile.async('text');
    const relsXml = relsFile ? await relsFile.async('text') : '';
    const rIdToMedia = parseRels(relsXml);

    const anchors = parseAnchors(drawingXml);
    for (const anchor of anchors) {
      const mediaTarget = rIdToMedia.get(anchor.rId);
      if (!mediaTarget) continue;
      const mediaPath = resolveMediaPath(mediaTarget);
      const dataUrl = await toDataUrl(zip, mediaPath);
      if (dataUrl) result.set(anchor.row, dataUrl);
    }
  }

  return result;
}