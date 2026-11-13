export type UserRemarks = Readonly<Record<string, string>>;
export interface ChatRemarksPort {
  load(signal: AbortSignal): Promise<UserRemarks>;
  save(remarks: UserRemarks, signal: AbortSignal): Promise<void>;
}
