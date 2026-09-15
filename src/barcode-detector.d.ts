interface DetectedBarcode {
  readonly boundingBox: DOMRectReadOnly;
  readonly rawValue: string;
  readonly format: string;
  readonly cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}

interface HTMLVideoElement {
  requestVideoFrameCallback?(
    callback: (now: number, metadata: unknown) => void,
  ): number;
  cancelVideoFrameCallback?(handle: number): void;
}
