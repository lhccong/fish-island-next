export interface ChatReportReason {
  value: number;
  text: string;
}
export interface ChatReportPort {
  reasons(signal: AbortSignal): Promise<readonly ChatReportReason[]>;
  submit(
    input: {
      targetId: string;
      targetUserId: string;
      reasonType: number;
      description: string;
    },
    signal: AbortSignal,
  ): Promise<void>;
}
