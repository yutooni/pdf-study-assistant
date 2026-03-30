export type DocumentStatus = 'uploaded';

export interface Document {
  id: string;
  filename: string;
  status: DocumentStatus;
  note?: string;
}
