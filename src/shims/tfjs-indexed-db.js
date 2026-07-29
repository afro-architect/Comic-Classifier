/* Stub for @tensorflow/tfjs-core/dist/io/indexed_db.
   The app never saves models to browser storage, and the preview sandbox
   forbids those APIs, so the handler is replaced with a no-op. */
export async function deleteDatabase() {}
export class BrowserIndexedDB {}
export const indexedDBRouter = () => null;
export function browserIndexedDB() { return null; }
export class BrowserIndexedDBManager {
  async listModels() { return {}; }
  async removeModel() { return null; }
}
