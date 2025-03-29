type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontStyle = 'normal' | 'italic';

type FontOptions = {
  name: string;
  data: ArrayBuffer;
  style: FontStyle;
  weight: Weight;
};

export async function loadSpaceGroteskFont(): Promise<FontOptions> {
  // Load the Space Grotesk font
  const spaceGroteskFont = await fetch(
    new URL('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap'),
  ).then((res) => res.text());

  const fontUrl = spaceGroteskFont.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)![1];
  const fontData = await fetch(fontUrl).then((res) => res.arrayBuffer());

  return {
    name: 'Space Grotesk',
    data: fontData,
    style: 'normal',
    weight: 700,
  };
} 