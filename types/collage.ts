export interface DetectedItem {
  id: string;
  label: string;
  query: string;
  checked: boolean;
}

export interface Photo {
  id: string;
  uploadedAt: string;
  detectedItems: DetectedItem[];
  dataUrl?: string;
}

export interface Canvas {
  id: string;
  title: string;
  createdAt: string;
  photos: Photo[];
}
