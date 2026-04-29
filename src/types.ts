export interface ColorPreset {
  id: string;
  name: string;
  color: string;
}

export interface MCQData {
  title: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  imageUrl: string | null;
  imageSettings: {
    height: number;
    width: number;
    crop?: { x: number; y: number };
    zoom?: number;
    croppedArea?: { x: number; y: number; width: number; height: number };
  };
  fontSettings: {
    family: string;
    questionSize: string;
    optionSize: string;
    optionPadding: number;
    optionGap: number;
  };
  watermark: {
    text: string;
    presets: string[];
    opacity: number;
  };
  showGuides?: boolean;
  guideColor?: 'white' | 'black';
  backgroundColor: string;
  presets: ColorPreset[];
}
