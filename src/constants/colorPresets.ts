export interface ColorPreset {
  name: string;
  bg: string;
  text: string;
  accent: string;
  line: string;
}

export const colorPresets: ColorPreset[] = [
  { name: 'Classic', bg: '#FFFFFF', text: '#1A1A1A', accent: '#007AFF', line: '#E5E5E7' },
  { name: 'Dark', bg: '#1A1A1A', text: '#FFFFFF', accent: '#0A84FF', line: '#3A3A3C' },
  { name: 'Sunset', bg: '#FF6B35', text: '#FFFFFF', accent: '#FFE66D', line: '#FF8C42' },
  { name: 'Ocean', bg: '#006BA6', text: '#FFFFFF', accent: '#0496FF', line: '#0582CA' },
  { name: 'Forest', bg: '#2D5016', text: '#FFFFFF', accent: '#61A5C2', line: '#4F7942' },
  { name: 'Purple', bg: '#6A4C93', text: '#FFFFFF', accent: '#C06C84', line: '#8B5A99' },
  { name: 'Cherry', bg: '#D90429', text: '#FFFFFF', accent: '#EF476F', line: '#F72C5B' },
];



