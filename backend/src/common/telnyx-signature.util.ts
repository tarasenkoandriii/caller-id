import * as crypto from 'crypto';

/**
 * Telnyx подписывает вебхуки Ed25519 (заголовки telnyx-signature-ed25519 и
 * telnyx-timestamp). Публичный ключ берётся из Portal → Webhooks.
 */
export function verifyTelnyxSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKeyBase64: string,
): boolean {
  try {
    const message = Buffer.from(`${timestamp}|${rawBody}`);
    const signatureBuffer = Buffer.from(signature, 'base64');
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'), // ASN.1 prefix для Ed25519
        Buffer.from(publicKeyBase64, 'base64'),
      ]),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(null, message, publicKey, signatureBuffer);
  } catch {
    return false;
  }
}
