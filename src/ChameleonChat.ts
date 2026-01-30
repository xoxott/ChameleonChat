// ChameleonChat.ts - 浏览器兼容版本（使用 Web Crypto API）

/* ==================== 1. BIP39 助记词生成 seed ==================== */
export async function mnemonicToSeed(mnemonic: string, passphrase = ""): Promise<Uint8Array> {
  const salt = "mnemonic" + passphrase;
  const encoder = new TextEncoder();
  const mnemonicData = encoder.encode(mnemonic.normalize("NFKD"));
  const saltData = encoder.encode(salt.normalize("NFKD"));
  
  // 使用 Web Crypto API 的 PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    mnemonicData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const seed = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltData,
      iterations: 2048,
      hash: "SHA-512",
    },
    keyMaterial,
    512 // 64 bytes = 512 bits
  );
  
  return new Uint8Array(seed);
}

/* ==================== 2. 派生 AES session key ==================== */
export async function deriveSessionKey(seed: Uint8Array, timeSlot: number, msgIndex: number): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = new Uint8Array([
    ...seed,
    ...encoder.encode(String(timeSlot)),
    ...encoder.encode(String(msgIndex))
  ]);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // 导入为 AES-GCM 密钥
  return crypto.subtle.importKey(
    "raw",
    hashArray,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/* ==================== 3. AES-GCM 加解密 ==================== */
export interface CipherObject {
  iv: string;
  data: string;
  tag: string;
}

export async function aesEncrypt(key: CryptoKey, plaintext: string): Promise<CipherObject> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource, 
    },
    key,
    encoder.encode(plaintext)
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  // GCM 模式下，tag 在加密数据的最后 16 字节
  const tag = encryptedArray.slice(-16);
  const data = encryptedArray.slice(0, -16);
  
  return {
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(data),
    tag: arrayBufferToBase64(tag),
  };
}

export async function aesDecrypt(key: CryptoKey, cipherObj: CipherObject): Promise<string> {
  const iv = base64ToArrayBuffer(cipherObj.iv);
  const data = base64ToArrayBuffer(cipherObj.data);
  const tag = base64ToArrayBuffer(cipherObj.tag);
  
  // 合并 data 和 tag
  const encrypted = new Uint8Array(data.length + tag.length);
  encrypted.set(data, 0);
  encrypted.set(tag, data.length);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource, 
    },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/* ==================== 4. 动态转义表 ==================== */
export type EscapeTable = { [key: number]: string };

export async function generateEscapeTable(seed: Uint8Array, timeSlot: number, msgIndex: number): Promise<EscapeTable> {
  const table: EscapeTable = {};

  // 基础符号集：emoji + 中文字符（去重）
  const baseSymbolsSet = new Set(Array.from(
    "😀😂😎😅🥳😇🤓🧐😋😛🤯💥🌟🔥🍀🎵🎶✨🌈💫🪐一二三四五六七八九十你好我他她它"
  ));
  
  // 扩展符号集：添加更多中文字符（去重）
  const extendedSymbolsSet = new Set(Array.from(
    "天地人日月水火木金土山川河流海洋森林草原沙漠城市乡村春夏秋冬东西南北前后左右上下大小多少长短高低快慢新旧好坏美丑真假善恶是非黑白红绿蓝黄紫橙灰棕粉金银铜铁钢铝石沙泥草花树鸟兽鱼虫车船飞机房屋门窗桌椅床柜书笔纸墨画音乐舞蹈诗歌小说散文戏剧电影电视电脑手机网络游戏运动健康快乐悲伤愤怒恐惧惊讶平静紧张放松忙碌空闲"
  ));
  
  // 添加更多可见的 Unicode 字符：各种符号、标点、数学符号等
  const visibleSymbolsSet = new Set(Array.from(
    // 数学符号
    "∑∏∫√∞±×÷≤≥≠≈≡∈∉⊂⊃∪∩∅∀∃∧∨¬⇒⇔"
    // 希腊字母
    + "αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"
    // 其他符号
    + "★☆♠♣♥♦♪♫♬♭♮♯"
    // 箭头符号
    + "←→↑↓↔↕↖↗↘↙"
    // 其他可见字符
    + "©®™€£¥$¢§¶†‡•…‰‹›«»„‚"
    // 更多中文字符
    + "风雷雨雪霜雾云霞虹霓电闪雷鸣雨过天晴春暖花开夏日炎炎秋高气爽冬雪纷飞"
    + "东南西北中上下左右前后内外远近高低深浅粗细长短宽窄厚薄轻重快慢新旧好坏"
    + "酸甜苦辣咸香臭美丑真假善恶是非黑白红绿蓝黄紫橙灰棕粉金银铜铁钢铝"
  ));
  
  // 合并所有符号并去重
  const allSymbolsSet = new Set([...baseSymbolsSet, ...extendedSymbolsSet, ...visibleSymbolsSet]);
  const allSymbols = Array.from(allSymbolsSet);
  
  // 生成 256 个唯一符号
  const symbols: string[] = [];
  const usedChars = new Set<string>();
  
  // 首先使用基础符号
  for (const sym of allSymbols) {
    if (symbols.length >= 256) break;
    if (!usedChars.has(sym)) {
      symbols.push(sym);
      usedChars.add(sym);
    }
  }
  
  // 如果符号数量仍然不足 256，使用更多可见的 Unicode 字符
  const fallbackRanges: Array<[number, number]> = [
    [0x2000, 0x206F], // 通用标点符号补充
    [0x2070, 0x209F], // 上标和下标
    [0x20A0, 0x20CF], // 货币符号
    [0x2100, 0x214F], // 字母式符号
    [0x2190, 0x21FF], // 箭头
    [0x2200, 0x22FF], // 数学运算符
    [0x2300, 0x23FF], // 杂项技术符号
    [0x2400, 0x243F], // 控制图片
    [0x2440, 0x245F], // 光学字符识别
    [0x2460, 0x24FF], // 带圈字母数字
    [0x2500, 0x257F], // 制表符
    [0x2580, 0x259F], // 方块元素
    [0x25A0, 0x25FF], // 几何图形
    [0x2600, 0x26FF], // 杂项符号
    [0x2700, 0x27BF], // 装饰符号
    [0x27C0, 0x27EF], // 杂项数学符号-A
    [0x27F0, 0x27FF], // 补充箭头-A
    [0x2900, 0x297F], // 补充箭头-B
    [0x2980, 0x29FF], // 杂项数学符号-B
    [0x2A00, 0x2AFF], // 补充数学运算符
    [0x2B00, 0x2BFF], // 杂项符号和箭头
    [0x1F300, 0x1F5FF], // 杂项符号和象形文字（更多 emoji）
    [0x1F600, 0x1F64F], // 表情符号
    [0x1F680, 0x1F6FF], // 交通和地图符号
    [0x1F700, 0x1F77F], // 炼金术符号
    [0x1F780, 0x1F7FF], // 几何图形扩展
    [0x1F800, 0x1F8FF], // 补充箭头-C
    [0x1F900, 0x1F9FF], // 补充符号和象形文字
  ];
  
  // 从各个范围中提取可见字符
  for (const [start, end] of fallbackRanges) {
    if (symbols.length >= 256) break;
    for (let code = start; code <= end && symbols.length < 256; code++) {
      try {
        const char = String.fromCodePoint(code);
        if (char.trim() !== '' || char.length > 0) {
          if (!usedChars.has(char)) {
            symbols.push(char);
            usedChars.add(char);
            if (symbols.length >= 256) break;
          }
        }
      } catch {
        // 忽略无效字符码点
      }
    }
  }
  
  // 如果仍然不足，使用基础字符的重复
  while (symbols.length < 256) {
    for (let i = 33; i < 127 && symbols.length < 256; i++) {
      const char = String.fromCharCode(i);
      if (!usedChars.has(char)) {
        symbols.push(char);
        usedChars.add(char);
        if (symbols.length >= 256) break;
      }
    }
    break;
  }

  // 使用 seed 生成确定性的随机排列
  const encoder = new TextEncoder();
  const hashData = new Uint8Array([
    ...seed,
    ...encoder.encode(String(timeSlot)),
    ...encoder.encode(String(msgIndex))
  ]);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
  const bytes = new Uint8Array(hashBuffer);

  // 使用 Fisher-Yates 洗牌算法
  const shuffledSymbols = [...symbols];
  for (let i = 255; i > 0; i--) {
    const j = bytes[i % bytes.length] % (i + 1);
    [shuffledSymbols[i], shuffledSymbols[j]] = [shuffledSymbols[j], shuffledSymbols[i]];
  }

  // 确保每个字节值映射到唯一的符号
  for (let i = 0; i < 256; i++) {
    table[i] = shuffledSymbols[i];
  }

  return table;
}

/* ==================== 5. 字节 ↔ 符号 ==================== */
export function bytesToSymbols(bytes: Uint8Array, table: EscapeTable): string {
  return Array.from(bytes).map(b => table[b]).join("");
}

export function symbolsToBytes(symbolStr: string, table: EscapeTable): Uint8Array {
  const reverse: { [symbol: string]: number } = {};
  for (const k in table) reverse[table[k]] = parseInt(k);

  const arr: number[] = [];
  // 正确处理 emoji / 单字符
  const symbols = Array.from(symbolStr);
  for (const sym of symbols) {
    if (!(sym in reverse)) {
      throw new Error(`无效符号: ${sym} (字符码: ${sym.codePointAt(0)})`);
    }
    arr.push(reverse[sym]);
  }

  return new Uint8Array(arr);
}

/* ==================== 6. 辅助函数 ==================== */
function arrayBufferToBase64(buffer: Uint8Array): string {
  const binary = String.fromCharCode(...buffer);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  return new Uint8Array(binary.split('').map(char => char.charCodeAt(0)));
}

/* ==================== 7. 对外接口 ==================== */
export interface EncryptParams {
  mnemonic: string;
  passphrase?: string;
  plaintext: string;
  timeSlot: number;
  msgIndex: number;
}

export interface DecryptParams {
  mnemonic: string;
  passphrase?: string;
  chatText: string;
  timeSlot: number;
  msgIndex: number;
}

export async function encryptTextToChat(params: EncryptParams): Promise<string> {
  const { mnemonic, passphrase = "", plaintext, timeSlot, msgIndex } = params;
  const seed = await mnemonicToSeed(mnemonic, passphrase);
  const key = await deriveSessionKey(seed, timeSlot, msgIndex);

  // AES 加密
  const cipherObj = await aesEncrypt(key, plaintext);

  // 拼接 iv + data + tag
  const ivBytes = base64ToArrayBuffer(cipherObj.iv);
  const dataBytes = base64ToArrayBuffer(cipherObj.data);
  const tagBytes = base64ToArrayBuffer(cipherObj.tag);
  
  const bytes = new Uint8Array(ivBytes.length + dataBytes.length + tagBytes.length);
  bytes.set(ivBytes, 0);
  bytes.set(dataBytes, ivBytes.length);
  bytes.set(tagBytes, ivBytes.length + dataBytes.length);

  // 动态转义表
  const table = await generateEscapeTable(seed, timeSlot, msgIndex);

  // 映射成聊天符号 + 中文字符
  return bytesToSymbols(bytes, table);
}

export async function decryptChatToText(params: DecryptParams): Promise<string> {
  const { mnemonic, passphrase = "", chatText, timeSlot, msgIndex } = params;
  const seed = await mnemonicToSeed(mnemonic, passphrase);
  const table = await generateEscapeTable(seed, timeSlot, msgIndex);

  // 符号 → 字节
  const bytes = symbolsToBytes(chatText, table);

  // 验证字节长度（iv: 12, tag: 16, data: 至少 0）
  if (bytes.length < 28) {
    throw new Error(`字节长度不足: 期望至少 28 字节，实际 ${bytes.length} 字节`);
  }

  // 拆分 iv / data / tag
  const ivBytes = bytes.slice(0, 12);
  const tagBytes = bytes.slice(bytes.length - 16);
  const dataBytes = bytes.slice(12, bytes.length - 16);

  // 将字节转换为 base64 字符串
  const iv = arrayBufferToBase64(ivBytes);
  const tag = arrayBufferToBase64(tagBytes);
  const data = arrayBufferToBase64(dataBytes);

  const cipherObj: CipherObject = { iv, data, tag };
  const key = await deriveSessionKey(seed, timeSlot, msgIndex);
  return aesDecrypt(key, cipherObj);
}
