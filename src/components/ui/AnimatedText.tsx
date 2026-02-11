import chalk from 'chalk';
import { type ReactNode, useEffect, useState } from 'react';
import { Text } from 'ink';

type AnimationName = 'pulse' | 'neon' | 'radar' | 'karaoke' | 'rainbow' | 'glitch';

type HexColor = `#${string}`;

type AnimationConfigs = {
  pulse: { baseColor?: HexColor; pulseColor?: HexColor };
  neon: { onColor?: HexColor; offColor?: HexColor };
  radar: { baseColor?: HexColor };
  karaoke: { highlightColor?: HexColor; baseColor?: HexColor };
  rainbow: { saturation?: number; brightness?: number };
  glitch: Record<string, never>;
};

type AnimationVariant = {
  [K in AnimationName]: { name: K; config?: AnimationConfigs[K] };
}[AnimationName];

type Props = {
  speed?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dimColor?: boolean;
  children: ReactNode;
} & (AnimationVariant | { name?: undefined; config?: AnimationConfigs['pulse'] });

function hexToRgb(hex: HexColor): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16) : parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const DELAYS: Record<AnimationName, number> = {
  pulse: 16,
  neon: 500,
  radar: 50,
  karaoke: 50,
  rainbow: 15,
  glitch: 55
};

const GLITCH_CHARS = '▓▒░█▀▄▌▐─│┤┐└┘├┬┴┼';

const TOTAL_PULSE_FRAMES = 120;

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function applyPulse(text: string, frame: number, config?: AnimationConfigs['pulse']): string {
  const [br, bg, bb] = hexToRgb(config?.baseColor ?? '#E6E6E6');
  const [pr, pg, pb] = hexToRgb(config?.pulseColor ?? '#FF1010');
  const t = (Math.sin((frame / TOTAL_PULSE_FRAMES) * Math.PI * 2) + 1) / 2;
  const r = lerp(br, pr, t);
  const g = lerp(bg, pg, t);
  const b = lerp(bb, pb, t);
  return chalk.rgb(r, g, b)(text);
}

function applyNeon(text: string, frame: number, config?: AnimationConfigs['neon']): string {
  const on = frame % 2 === 0;
  const onColor = config?.onColor ?? '#00FFFF';
  const offColor = config?.offColor ?? '#325050';
  return on ? chalk.hex(onColor)(text) : chalk.hex(offColor)(text);
}

function applyRadar(text: string, frame: number, config?: AnimationConfigs['radar']): string {
  const [br, bg, bb] = hexToRgb(config?.baseColor ?? '#3C3C3C');
  const depth = Math.max(1, Math.floor(text.length * 0.2));
  const globalPos = frame % (text.length + depth);

  const chars: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const pos = -(i - globalPos);
    if (pos > 0 && pos <= depth - 1) {
      const t = (depth - pos) / depth;
      chars.push(chalk.rgb(lerp(br, 255, t), lerp(bg, 255, t), lerp(bb, 255, t))(text[i]));
    } else {
      chars.push(chalk.rgb(br, bg, bb)(text[i]));
    }
  }
  return chars.join('');
}

function applyKaraoke(text: string, frame: number, config?: AnimationConfigs['karaoke']): string {
  const highlightColor = config?.highlightColor ?? '#FFBB00';
  const baseColor = config?.baseColor ?? '#FFFFFF';
  const pos = (frame % (text.length + 20)) - 10;
  if (pos < 0) {
    return chalk.hex(baseColor)(text);
  }
  return chalk.hex(highlightColor).bold(text.substring(0, pos)) + chalk.hex(baseColor)(text.substring(pos));
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const map: [number, number, number][] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q]
  ];
  return map[i].map((c) => Math.round(c * 255)) as [number, number, number];
}

function applyRainbow(text: string, frame: number, config?: AnimationConfigs['rainbow']): string {
  const sat = config?.saturation ?? 1;
  const bri = config?.brightness ?? 1;
  const hueStart = (5 * frame) % 360;
  const chars: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const hue = (hueStart + (i * 360) / Math.max(text.length, 1)) % 360;
    const [r, g, b] = hsvToRgb(hue, sat, bri);
    chars.push(chalk.rgb(r, g, b)(text[i]));
  }
  return chars.join('');
}

function applyGlitch(text: string, frame: number): string {
  if ((frame % 2) + (frame % 3) + (frame % 11) + (frame % 29) + (frame % 37) > 52) {
    return text.replace(/[^\r\n]/g, ' ');
  }

  const chunkSize = Math.max(3, Math.round(text.length * 0.02));
  const chars: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const skip = Math.round(Math.max(0, (Math.random() - 0.8) * chunkSize));
    chars.push(text.substring(i, i + skip).replace(/[^\r\n]/g, ' '));
    i += skip;
    if (text[i]) {
      if (text[i] !== '\n' && text[i] !== '\r' && Math.random() > 0.995) {
        chars.push(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
      } else if (Math.random() > 0.005) {
        chars.push(text[i]);
      }
    }
  }

  return chars.join('');
}

function applyAnimation(
  text: string,
  name: AnimationName,
  frame: number,
  config?: AnimationConfigs[AnimationName]
): string {
  switch (name) {
    case 'pulse':
      return applyPulse(text, frame, config as AnimationConfigs['pulse']);
    case 'neon':
      return applyNeon(text, frame, config as AnimationConfigs['neon']);
    case 'radar':
      return applyRadar(text, frame, config as AnimationConfigs['radar']);
    case 'karaoke':
      return applyKaraoke(text, frame, config as AnimationConfigs['karaoke']);
    case 'rainbow':
      return applyRainbow(text, frame, config as AnimationConfigs['rainbow']);
    case 'glitch':
      return applyGlitch(text, frame);
  }
}

function flattenChildren(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (children == null || typeof children === 'boolean') return '';
  if (Array.isArray(children)) return children.map(flattenChildren).join('');
  return '';
}

export default function AnimatedText({
  name = 'pulse',
  speed = 1,
  bold,
  italic,
  underline,
  strikethrough,
  dimColor,
  config,
  children
}: Props) {
  const [frame, setFrame] = useState(0);
  const text = flattenChildren(children);

  useEffect(() => {
    const delay = DELAYS[name] / speed;
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
    }, delay);
    return () => clearInterval(interval);
  }, [name, speed]);

  let animated = applyAnimation(text, name, frame, config);
  if (bold) animated = chalk.bold(animated);
  if (italic) animated = chalk.italic(animated);
  if (underline) animated = chalk.underline(animated);
  if (strikethrough) animated = chalk.strikethrough(animated);
  if (dimColor) animated = chalk.dim(animated);

  return <Text>{animated}</Text>;
}
