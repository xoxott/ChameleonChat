/**
 * BIP39 风格助记词 → seed（PBKDF2-SHA512）
 */

export async function mnemonicToSeed(mnemonic: string, passphrase = ""): Promise<Uint8Array> {
  const salt = "mnemonic" + passphrase
  const encoder = new TextEncoder()
  const mnemonicData = encoder.encode(mnemonic.normalize("NFKD"))
  const saltData = encoder.encode(salt.normalize("NFKD"))

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    mnemonicData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  )

  const seed = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltData,
      iterations: 2048,
      hash: "SHA-512",
    },
    keyMaterial,
    512 // 64 bytes
  )

  return new Uint8Array(seed)
}
