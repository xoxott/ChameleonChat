/**
 * 动态转义表：字节 ↔ 可见符号（emoji/中文等），用于隐藏密文特征
 */

export type EscapeTable = { [key: number]: string }

const FALLBACK_RANGES: ReadonlyArray<[number, number]> = [
  [0x2000, 0x206F], [0x2070, 0x209F], [0x20A0, 0x20CF], [0x2100, 0x214F],
  [0x2190, 0x21FF], [0x2200, 0x22FF], [0x2300, 0x23FF], [0x2400, 0x243F],
  [0x2440, 0x245F], [0x2460, 0x24FF], [0x2500, 0x257F], [0x2580, 0x259F],
  [0x25A0, 0x25FF], [0x2600, 0x26FF], [0x2700, 0x27BF], [0x27C0, 0x27EF],
  [0x27F0, 0x27FF], [0x2900, 0x297F], [0x2980, 0x29FF], [0x2A00, 0x2AFF],
  [0x2B00, 0x2BFF], [0x1F300, 0x1F5FF], [0x1F600, 0x1F64F], [0x1F680, 0x1F6FF],
  [0x1F700, 0x1F77F], [0x1F780, 0x1F7FF], [0x1F800, 0x1F8FF], [0x1F900, 0x1F9FF],
]

const BASE_SYMBOLS =
  "😀😂😎😅🥳😇🤓🧐😋😛🤯💥🌟🔥🍀🎵🎶✨🌈💫🪐一二三四五六七八九十你好我他她它"
const EXTENDED_SYMBOLS =
  "天地人日月水火木金土山川河流海洋森林草原沙漠城市乡村春夏秋冬东西南北前后左右上下大小多少长短高低快慢新旧好坏美丑真假善恶是非黑白红绿蓝黄紫橙灰棕粉金银铜铁钢铝石沙泥草花树鸟兽鱼虫车船飞机房屋门窗桌椅床柜书笔纸墨画音乐舞蹈诗歌小说散文戏剧电影电视电脑手机网络游戏运动健康快乐悲伤愤怒恐惧惊讶平静紧张放松忙碌空闲"
const VISIBLE_SYMBOLS =
  "∑∏∫√∞±×÷≤≥≠≈≡∈∉⊂⊃∪∩∅∀∃∧∨¬⇒⇔αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ★☆♠♣♥♦♪♫♬♭♮♯←→↑↓↔↕↖↗↘↙©®™€£¥$¢§¶†‡•…‰‹›«»„‚" +
  "风雷雨雪霜雾云霞虹霓电闪雷鸣雨过天晴春暖花开夏日炎炎秋高气爽冬雪纷飞东南西北中上下左右前后内外远近高低深浅粗细长短宽窄厚薄轻重快慢新旧好坏酸甜苦辣咸香臭美丑真假善恶是非黑白红绿蓝黄紫橙灰棕粉金银铜铁钢铝"

/** 缓存的 256 符号列表，只构建一次 */
let cachedSymbolList: string[] | null = null

function getSymbolList(): string[] {
  if (cachedSymbolList) return cachedSymbolList
  const used = new Set<string>()
  const out: string[] = []
  for (const ch of new Set([...BASE_SYMBOLS, ...EXTENDED_SYMBOLS, ...VISIBLE_SYMBOLS])) {
    if (out.length >= 256) break
    out.push(ch)
    used.add(ch)
  }
  for (const [start, end] of FALLBACK_RANGES) {
    if (out.length >= 256) break
    for (let code = start; code <= end && out.length < 256; code++) {
      try {
        const ch = String.fromCodePoint(code)
        if ((ch.trim() !== "" || ch.length > 0) && !used.has(ch)) {
          out.push(ch)
          used.add(ch)
        }
      } catch { /* skip */ }
    }
  }
  for (let i = 33; i < 127 && out.length < 256; i++) {
    const ch = String.fromCharCode(i)
    if (!used.has(ch)) {
      out.push(ch)
      used.add(ch)
    }
  }
  cachedSymbolList = out
  return cachedSymbolList
}

/** Fisher-Yates 洗牌得到 table[0..255] */
function shuffleToTable(symbols: string[], hashBytes: Uint8Array): EscapeTable {
  const shuffled = symbols.slice(0, 256)
  for (let i = 255; i > 0; i--) {
    const j = hashBytes[i % hashBytes.length] % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const table: EscapeTable = {}
  for (let i = 0; i < 256; i++) table[i] = shuffled[i]
  return table
}

/** 统一：hashData → SHA256 → 洗牌 → EscapeTable */
async function hashToTable(hashData: Uint8Array): Promise<EscapeTable> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", hashData as BufferSource)
  return shuffleToTable(getSymbolList(), new Uint8Array(hashBuffer))
}

/** 从 seed + timeSlot + msgIndex 生成转义表（旧 API 兼容） */
export async function generateEscapeTable(
  seed: Uint8Array,
  timeSlot: number,
  msgIndex: number
): Promise<EscapeTable> {
  const enc = new TextEncoder()
  const hashData = new Uint8Array([
    ...seed,
    ...enc.encode(String(timeSlot)),
    ...enc.encode(String(msgIndex)),
  ])
  return hashToTable(hashData)
}

/** 从 slotState + msgIndex 生成转义表（Ratchet 用） */
export async function generateEscapeTableFromState(
  slotState: Uint8Array,
  msgIndex: number
): Promise<EscapeTable> {
  const enc = new TextEncoder()
  const hashData = new Uint8Array([...slotState, ...enc.encode(String(msgIndex))])
  return hashToTable(hashData)
}

export function bytesToSymbols(bytes: Uint8Array, table: EscapeTable): string {
  return Array.from(bytes)
    .map((b) => table[b])
    .join("")
}

export function symbolsToBytes(symbolStr: string, table: EscapeTable): Uint8Array {
  const reverse = new Map<string, number>()
  for (let i = 0; i < 256; i++) reverse.set(table[i], i)
  const arr: number[] = []
  for (const sym of Array.from(symbolStr)) {
    const b = reverse.get(sym)
    if (b === undefined) throw new Error(`无效符号: ${sym} (字符码: ${sym.codePointAt(0)})`)
    arr.push(b)
  }
  return new Uint8Array(arr)
}
