export type ImageAnalysis = {
  title: string;
  tagsZh: string[];
  tagsEn: string[];
  productTypes: string[];
  imageTypes: Array<"白底图" | "场景图" | "细节图" | "功能图" | "包装图" | "品牌故事图" | "A+图" | "其他">;
  styles: string[];
  scenes: string[];
  suitableUses: string[];
  dominantColors: Array<{ nameZh: string; hex: string; ratio: number }>;
  composition: {
    framing: string;
    cameraAngle: string;
    lighting: string;
    negativeSpace: string;
  };
  designReferences: string[];
  promptZh: string;
  promptEn: string;
  confidence: number;
};

export function validateAnalysis(value: ImageAnalysis) {
  if (!value.title.trim()) throw new Error("AI 分析缺少标题");
  if (value.confidence < 0 || value.confidence > 1) throw new Error("置信度必须在 0–1");
  if (value.dominantColors.some(color => !/^#[0-9a-f]{6}$/i.test(color.hex))) {
    throw new Error("主色值必须为六位 HEX");
  }
  return value;
}
