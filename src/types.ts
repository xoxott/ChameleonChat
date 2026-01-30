export interface Message {
  id: number;
  text: string;
  encryptedText?: string;
  sender: 'user' | 'bot' | 'system';
  time: string;
}

export type TabType = 'chat' | 'encrypt';

export interface Config {
  mnemonic: string;
  passphrase: string;
  timeSlot: number;
  manualTimeSlot: number | null;
}
