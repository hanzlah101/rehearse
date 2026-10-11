// Adapted from the ElevenLabs UI Orb (MIT): https://ui.elevenlabs.io/docs/components/orb
// The shaders are unchanged apart from a tinted base; the wrapper is trimmed to the states Rehearse
// uses, and the noise texture is bundled so the orb works offline.
// three.js uniforms are mutated every frame by design (that is how shaders
// animate), which the React Compiler rule cannot model.
/* oxlint-disable react/immutability */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { cn } from "cn";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import perlinNoise from "@/assets/perlin-noise.png";

const VERTEX_SHADER = `
uniform float uTime;
uniform sampler2D uPerlinTexture;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform float uAnimation;
uniform float uInverted;
uniform float uOffsets[7];
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uInputVolume;
uniform float uOutputVolume;
uniform float uOpacity;
uniform sampler2D uPerlinTexture;
varying vec2 vUv;

const float PI = 3.14159265358979323846;

// Draw a single oval with soft edges and calculate its gradient color
bool drawOval(vec2 polarUv, vec2 polarCenter, float a, float b, bool reverseGradient, float softness, out vec4 color) {
    vec2 p = polarUv - polarCenter;
    float oval = (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b);

    float edge = smoothstep(1.0, 1.0 - softness, oval);

    if (edge > 0.0) {
        float gradient = reverseGradient ? (1.0 - (p.x / a + 1.0) / 2.0) : ((p.x / a + 1.0) / 2.0);
        // Flatten gradient toward middle value for more uniform appearance
        gradient = mix(0.5, gradient, 0.1);
        color = vec4(vec3(gradient), 0.85 * edge);
        return true;
    }
    return false;
}

// Map grayscale value to a 4-color ramp (color1, color2, color3, color4)
vec3 colorRamp(float grayscale, vec3 color1, vec3 color2, vec3 color3, vec3 color4) {
    if (grayscale < 0.33) {
        return mix(color1, color2, grayscale * 3.0);
    } else if (grayscale < 0.66) {
        return mix(color2, color3, (grayscale - 0.33) * 3.0);
    } else {
        return mix(color3, color4, (grayscale - 0.66) * 3.0);
    }
}

vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// 2D noise for the ring
float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
    );

    return 0.5 + 0.5 * n;
}

float sharpRing(vec3 decomposed, float time) {
    float ringStart = 1.0;
    float ringWidth = 0.3;
    float noiseScale = 5.0;

    float noise = mix(
        noise2D(vec2(decomposed.x, time) * noiseScale),
        noise2D(vec2(decomposed.y, time) * noiseScale),
        decomposed.z
    );

    noise = (noise - 0.5) * 2.5;

    return ringStart + noise * ringWidth * 1.5;
}

float smoothRing(vec3 decomposed, float time) {
    float ringStart = 0.9;
    float ringWidth = 0.2;
    float noiseScale = 6.0;

    float noise = mix(
        noise2D(vec2(decomposed.x, time) * noiseScale),
        noise2D(vec2(decomposed.y, time) * noiseScale),
        decomposed.z
    );

    noise = (noise - 0.5) * 5.0;

    return ringStart + noise * ringWidth;
}

float flow(vec3 decomposed, float time) {
    return mix(
        texture(uPerlinTexture, vec2(time, decomposed.x / 2.0)).r,
        texture(uPerlinTexture, vec2(time, decomposed.y / 2.0)).r,
        decomposed.z
    );
}

void main() {
    // Normalize vUv to be centered around (0.0, 0.0)
    vec2 uv = vUv * 2.0 - 1.0;

    // Convert uv to polar coordinates
    float radius = length(uv);
    float theta = atan(uv.y, uv.x);
    if (theta < 0.0) theta += 2.0 * PI; // Normalize theta to [0, 2*PI]

    // Decomposed angle is used for sampling noise textures without seams:
    // float noise = mix(sample(decomposed.x), sample(decomposed.y), decomposed.z);
    vec3 decomposed = vec3(
        // angle in the range [0, 1]
        theta / (2.0 * PI),
        // angle offset by 180 degrees in the range [1, 2]
        mod(theta / (2.0 * PI) + 0.5, 1.0) + 1.0,
        // mixing factor between two noises
        abs(theta / PI - 1.0)
    );

    // Add noise to the angle for a flow-like distortion (reduced for flatter look)
    float noise = flow(decomposed, radius * 0.03 - uAnimation * 0.2) - 0.5;
    theta += noise * mix(0.08, 0.25, uOutputVolume);

    // Base between the light colour and white (upstream: pure white), so gaps
    // between the ovals read as a soft tint instead of hard white/black wedges.
    vec4 color = vec4(0.72, 0.72, 0.72, 1.0);

    // Original parameters for the ovals in polar coordinates
    float originalCenters[7] = float[7](0.0, 0.5 * PI, 1.0 * PI, 1.5 * PI, 2.0 * PI, 2.5 * PI, 3.0 * PI);

    // Parameters for the animated centers in polar coordinates
    float centers[7];
    for (int i = 0; i < 7; i++) {
        centers[i] = originalCenters[i] + 0.5 * sin(uTime / 20.0 + uOffsets[i]);
    }

    float a, b;
    vec4 ovalColor;

    // Check if the pixel is inside any of the ovals
    for (int i = 0; i < 7; i++) {
        float noise = texture(uPerlinTexture, vec2(mod(centers[i] + uTime * 0.05, 1.0), 0.5)).r;
        a = 0.5 + noise * 0.3; // Increased for more coverage
        b = noise * mix(3.5, 2.5, uInputVolume); // Increased height for fuller appearance
        bool reverseGradient = (i % 2 == 1); // Reverse gradient for every second oval

        // Calculate the distance in polar coordinates
        float distTheta = min(
            abs(theta - centers[i]),
            min(
                abs(theta + 2.0 * PI - centers[i]),
                abs(theta - 2.0 * PI - centers[i])
            )
        );
        float distRadius = radius;

        float softness = 0.6; // Increased softness for flatter, less pronounced edges

        // Check if the pixel is inside the oval in polar coordinates
        if (drawOval(vec2(distTheta, distRadius), vec2(0.0, 0.0), a, b, reverseGradient, softness, ovalColor)) {
            // Blend the oval color with the existing color
            color.rgb = mix(color.rgb, ovalColor.rgb, ovalColor.a);
            color.a = max(color.a, ovalColor.a); // Max alpha
        }
    }
    
    // Calculate both noisy rings
    float ringRadius1 = sharpRing(decomposed, uTime * 0.1);
    float ringRadius2 = smoothRing(decomposed, uTime * 0.1);
    
    // Adjust rings based on input volume (reduced for flatter appearance)
    float inputRadius1 = radius + uInputVolume * 0.2;
    float inputRadius2 = radius + uInputVolume * 0.15;
    float opacity1 = mix(0.2, 0.6, uInputVolume);
    float opacity2 = mix(0.15, 0.45, uInputVolume);

    // Blend both rings
    float ringAlpha1 = (inputRadius2 >= ringRadius1) ? opacity1 : 0.0;
    float ringAlpha2 = smoothstep(ringRadius2 - 0.05, ringRadius2 + 0.05, inputRadius1) * opacity2;
    
    float totalRingAlpha = max(ringAlpha1, ringAlpha2);
    
    // Apply screen blend mode for combined rings
    vec3 ringColor = vec3(1.0); // White ring color
    color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - ringColor * totalRingAlpha);

    // Define colours to ramp against greyscale (could increase the amount of colours in the ramp)
    vec3 color1 = vec3(0.0, 0.0, 0.0); // Black
    vec3 color2 = uColor1; // Darker Color
    vec3 color3 = uColor2; // Lighter Color
    vec3 color4 = vec3(1.0, 1.0, 1.0); // White

    // Convert grayscale color to the color ramp
    float luminance = mix(color.r, 1.0 - color.r, uInverted);
    color.rgb = colorRamp(luminance, color1, color2, color3, color4); // Apply the color ramp

    // Apply fade-in opacity
    color.a *= uOpacity;

    gl_FragColor = color;
}
`;

export type OrbState = "idle" | "listening" | "thinking";

// Loaded once and shared by every orb.
const noiseTexture = new THREE.TextureLoader().load(perlinNoise);
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

// Fixed phase offsets for the seven ovals (golden-ratio spread), so every orb
// starts the same instead of from a random seed.
const OFFSETS = new Float32Array(
  Array.from(
    { length: 7 },
    (_, index) => ((index * 0.618034) % 1) * Math.PI * 2
  )
);

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

// Input (how much the orb blooms) and output (how fast it churns) targets for
// each state; `volume` replaces the listening wobble with a real mic level.
function targetsFor(state: OrbState, time: number, volume: number | undefined) {
  const t = time * 2;

  switch (state) {
    case "listening": {
      return {
        input: volume ?? clamp01(0.55 + Math.sin(t * 3.2) * 0.35),
        output: 0.45,
      };
    }
    case "thinking": {
      return {
        input: clamp01(
          0.38 +
            0.07 * Math.sin(t * 0.7) +
            0.05 * Math.sin(t * 2.1) * Math.sin(t * 0.37 + 1.2)
        ),
        output: clamp01(0.48 + 0.12 * Math.sin(t * 1.05 + 0.6)),
      };
    }
    case "idle": {
      return { input: 0, output: 0.3 };
    }
    default: {
      return { input: 0, output: 0.3 };
    }
  }
}

function createUniforms() {
  return {
    uAnimation: { value: 0.1 },
    uColor1: { value: new THREE.Color() },
    uColor2: { value: new THREE.Color() },
    uInputVolume: { value: 0 },
    uInverted: {
      value: document.documentElement.classList.contains("dark") ? 1 : 0,
    },
    uOffsets: { value: OFFSETS },
    uOpacity: { value: 0 },
    uOutputVolume: { value: 0 },
    uPerlinTexture: { value: noiseTexture },
    uTime: { value: 0 },
  };
}

// One material per orb; its uniforms stay typed for the frame loop.
function createMaterial() {
  const uniforms = createUniforms();
  const material = new THREE.ShaderMaterial({
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    uniforms,
    vertexShader: VERTEX_SHADER,
  });

  return { material, uniforms };
}

function Scene({
  colors,
  getVolume,
  state,
}: {
  colors: [string, string];
  getVolume?: () => number;
  state: OrbState;
}) {
  const { gl } = useThree();
  const { material, uniforms } = useMemo(() => createMaterial(), []);
  const motion = useRef({ input: 0, output: 0.3, speed: 0.1 });

  useEffect(() => {
    uniforms.uColor1.value.set(colors[0]);
    uniforms.uColor2.value.set(colors[1]);
  }, [colors, uniforms]);

  // The shader blends differently on dark backgrounds; follow the theme class.
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      uniforms.uInverted.value = html.classList.contains("dark") ? 1 : 0;
    });
    observer.observe(html, { attributeFilter: ["class"], attributes: true });
    return () => {
      observer.disconnect();
    };
  }, [uniforms]);

  useEffect(() => {
    const canvas = gl.domElement;
    function restore(event: Event) {
      event.preventDefault();
      setTimeout(() => {
        gl.forceContextRestore();
      }, 1);
    }
    canvas.addEventListener("webglcontextlost", restore);
    return () => {
      canvas.removeEventListener("webglcontextlost", restore);
      material.dispose();
    };
  }, [gl, material]);

  useFrame((_, delta) => {
    const { current } = motion;
    const target = targetsFor(
      state,
      uniforms.uTime.value,
      getVolume === undefined ? undefined : clamp01(getVolume())
    );

    current.input += (target.input - current.input) * 0.2;
    current.output += (target.output - current.output) * 0.2;
    current.speed +=
      (0.1 + (1 - (current.output - 1) ** 2) * 0.9 - current.speed) * 0.12;

    uniforms.uTime.value += delta * 0.5;
    uniforms.uOpacity.value = Math.min(1, uniforms.uOpacity.value + delta * 2);
    uniforms.uAnimation.value += delta * current.speed;
    uniforms.uInputVolume.value = current.input;
    uniforms.uOutputVolume.value = current.output;
  });

  return (
    <mesh material={material}>
      <circleGeometry args={[3.5, 64]} />
    </mesh>
  );
}

// A soft, living sphere for voice states: idle drifts, listening blooms (with
// the mic level from `getVolume` when given), thinking churns slowly.
export function Orb({
  className,
  colors,
  getVolume,
  state = "idle",
}: {
  className?: string;
  colors: [string, string];
  getVolume?: () => number;
  state?: OrbState;
}) {
  return (
    <div data-slot="orb" className={cn("relative size-full", className)}>
      <Canvas
        gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}
        resize={{ debounce: 100 }}
      >
        <Scene colors={colors} getVolume={getVolume} state={state} />
      </Canvas>
    </div>
  );
}
