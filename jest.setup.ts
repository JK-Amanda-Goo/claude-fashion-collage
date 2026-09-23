import "@testing-library/jest-dom";
import { webcrypto } from "crypto";
import { TextEncoder, TextDecoder } from "util";

// Polyfill Web APIs missing from jsdom
Object.defineProperty(global, "crypto", { value: webcrypto, writable: true });
Object.defineProperty(global, "TextEncoder", { value: TextEncoder, writable: true });
Object.defineProperty(global, "TextDecoder", { value: TextDecoder, writable: true });
