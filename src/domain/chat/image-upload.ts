export interface ChatImageUploadPort {
  upload(file: File, signal: AbortSignal): Promise<string>;
}
