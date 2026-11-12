export interface Donation {
  id: string;
  amount: number;
  name: string;
  avatar: string;
  frame: string;
  remark: string;
  createdAt: string;
}
export interface DonationPage {
  records: Donation[];
  total: number;
}
export interface PayOrder {
  id: string;
  amount: number;
  status: string;
  payUrl: string;
  qrCode: string;
}
export interface AboutPort {
  donations(page: number, details: boolean, signal: AbortSignal): Promise<DonationPage>;
  createOrder(
    amount: number,
    remark: string,
    returnUrl: string,
    signal: AbortSignal,
  ): Promise<PayOrder>;
  order(id: string, signal: AbortSignal): Promise<PayOrder>;
}
