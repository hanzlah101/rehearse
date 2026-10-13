import { chmod, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Downloads Praat (PLAN §3.4: acoustic measurement, GPL, so it only ever runs
// as a separate process) for the build target into
// src-tauri/binaries/praat-<target triple>, the file name Tauri's externalBin
// expects. Pinned version, SHA-256 checked. Skips if already there.
import { $ } from "bun";

const VERSION = "7.0.02";
const TAG = VERSION.replaceAll(".", "");
const BASE_URL = `https://github.com/praat/praat/releases/download/v${VERSION}`;

type Build = { asset: string; entry: string; sha256: string };

const MAC: Build = {
  asset: `praat${TAG}_mac.dmg`,
  entry: "Praat.app/Contents/MacOS/Praat",
  sha256: "9e4d1d220cff32ccfa4521114d23c11ebbfd792db61884f6019a44bd4aba19d4",
};

const BUILDS: Record<string, Build> = {
  "aarch64-apple-darwin": MAC,
  "aarch64-pc-windows-msvc": {
    asset: `praat${TAG}_win-arm64.zip`,
    entry: "Praat.exe",
    sha256: "0322bb7546eb2fdd0b3b0b8821adda39eea27125303bd79c640d96b5767f8509",
  },
  "aarch64-unknown-linux-gnu": {
    asset: `praat${TAG}_linux-arm64-barren.tar.gz`,
    entry: "praat_barren",
    sha256: "4055301ff731673b86ededfcb55e763e529bebf617bb14983bc7d33fd8d62b13",
  },
  "x86_64-apple-darwin": MAC,
  "x86_64-pc-windows-msvc": {
    asset: `praat${TAG}_win-x64v1.zip`,
    entry: "Praat.exe",
    sha256: "d8c741104faec65c5e6d77f460140f60b0568143b22506c079a4b7aa0b8d45a0",
  },
  "x86_64-unknown-linux-gnu": {
    asset: `praat${TAG}_linux-x64v3-barren.tar.gz`,
    entry: "praat_barren",
    sha256: "9de54aa7393862f519bde3c2e3bc35ba41ba8352a77856c8d278fe27f4f9c07c",
  },
};

async function targetTriple() {
  const fromTauri = process.env.TAURI_ENV_TARGET_TRIPLE;
  if (fromTauri !== undefined && fromTauri !== "") {
    return fromTauri;
  }
  const info = await $`rustc -vV`.nothrow().quiet().text();
  const host = /^host: (?<triple>\S+)$/mu.exec(info)?.groups?.triple;
  if (host !== undefined) {
    return host;
  }
  // No rustc on PATH: this machine's triple.
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  const systems: Record<string, string> = {
    darwin: "apple-darwin",
    linux: "unknown-linux-gnu",
    win32: "pc-windows-msvc",
  };
  return `${arch}-${systems[process.platform] ?? process.platform}`;
}

const triple = await targetTriple();
const build = BUILDS[triple];
if (build === undefined) {
  throw new Error(`No Praat build for ${triple}.`);
}

const binaries = path.join(import.meta.dir, "..", "src-tauri", "binaries");
const output = path.join(
  binaries,
  `praat-${triple}${triple.includes("windows") ? ".exe" : ""}`
);

if (await Bun.file(output).exists()) {
  process.exit(0);
}

console.log(`Downloading Praat ${VERSION} for ${triple}…`);
const response = await fetch(`${BASE_URL}/${build.asset}`);
if (!response.ok) {
  throw new Error(`Praat download failed: HTTP ${response.status}.`);
}
const archive = new Uint8Array(await response.arrayBuffer());
const digest = new Bun.CryptoHasher("sha256").update(archive).digest("hex");
if (digest !== build.sha256) {
  throw new Error(
    `Praat checksum mismatch: expected ${build.sha256}, got ${digest}.`
  );
}

const work = await mkdtemp(path.join(tmpdir(), "praat-"));
try {
  const archivePath = path.join(work, build.asset);
  await Bun.write(archivePath, archive);
  const extracted = path.join(work, "out");
  await mkdir(extracted);

  if (build === MAC) {
    const mount = path.join(work, "mount");
    await $`hdiutil attach -nobrowse -readonly -mountpoint ${mount} ${archivePath}`.quiet();
    try {
      await copyFile(
        path.join(mount, build.entry),
        path.join(extracted, "praat")
      );
    } finally {
      await $`hdiutil detach ${mount}`.quiet();
    }
    // Outside its .app the bundle signature no longer holds and macOS kills
    // it: keep only this architecture and sign it ad hoc (Tauri re-signs
    // sidecars with the app's identity when bundling).
    const arch = triple.startsWith("aarch64") ? "arm64" : "x86_64";
    await $`lipo ${path.join(extracted, "praat")} -thin ${arch} -output ${output}`.quiet();
    await $`codesign --force --sign - ${output}`.quiet();
  } else {
    // bsdtar reads .zip too (built into Windows 10+).
    await $`tar -xf ${archivePath} -C ${extracted}`.quiet();
    await mkdir(binaries, { recursive: true });
    await copyFile(path.join(extracted, build.entry), output);
  }

  await chmod(output, 0o755);
  console.log(`Praat ready: ${output}`);
} finally {
  await rm(work, { force: true, recursive: true });
}
