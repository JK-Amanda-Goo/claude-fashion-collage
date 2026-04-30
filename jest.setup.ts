import "@testing-library/jest-dom";

// Polyfill Web APIs missing from jsdom
const { webcrypto } = require("crypto");
const { TextEncoder, TextDecoder } = require("util");
Object.defineProperty(global, "crypto", { value: webcrypto, writable: true });
Object.defineProperty(global, "TextEncoder", { value: TextEncoder, writable: true });
Object.defineProperty(global, "TextDecoder", { value: TextDecoder, writable: true });
