/**
 * Type declarations for text-encoding module
 * Used by applyGlobalPolyfills.ts
 */
declare module 'text-encoding' {
  export class TextEncoder {
    encode(input?: string): Uint8Array;
  }
  
  export class TextDecoder {
    decode(input?: Uint8Array): string;
  }
}
