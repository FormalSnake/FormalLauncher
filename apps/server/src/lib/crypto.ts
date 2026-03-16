import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { Database } from '../db'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export function getKek(): Buffer {
  const hex = process.env.ENCRYPTION_KEK
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('ENCRYPTION_KEK must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export function generateDek(): Buffer {
  return randomBytes(32)
}

export function encryptDek(dek: Buffer, kek: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, kek, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`
}

export function decryptDek(encoded: string, kek: Buffer): Buffer {
  const [ivB64, ciphertextB64, tagB64] = encoded.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, kek, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function encryptField(plaintext: string, dek: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`
}

export function decryptField(ciphertext: string, dek: Buffer): string {
  const [ivB64, encB64, tagB64] = ciphertext.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, dek, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export async function getOrCreateUserDek(db: Database, userId: string): Promise<Buffer> {
  const kek = getKek()

  const [user] = await db
    .select({ encryptedDek: users.encryptedDek })
    .from(users)
    .where(eq(users.id, userId))

  if (user?.encryptedDek) {
    return decryptDek(user.encryptedDek, kek)
  }

  const dek = generateDek()
  const encrypted = encryptDek(dek, kek)

  await db
    .update(users)
    .set({ encryptedDek: encrypted })
    .where(eq(users.id, userId))

  return dek
}
