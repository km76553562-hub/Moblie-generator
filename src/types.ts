export interface Wallpaper {
  id: string;
  imageUrl: string | null;
  styleName: string;
  description: string;
  englishPrompt: string;
  mood: string;
  timestamp: number;
}

export interface PresetMood {
  id: string;
  emoji: string;
  label: string;
  prompt: string;
}
