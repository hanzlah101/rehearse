use std::env;
use std::process::Command;

fn main() {
    link_clang_runtime_on_macos();
    tauri_build::build()
}

/// whisper.cpp's Metal backend guards newer APIs with `@available(macOS 15, *)`.
/// Below that deployment target (`bundle.macOS.minimumSystemVersion`, applied
/// to release builds only) clang compiles each guard into a call to
/// `__isPlatformVersionAtLeast`, which lives in clang's runtime library. rustc
/// doesn't link that library, so release builds failed with an undefined
/// symbol; link it here. It's a universal archive, so it covers both Mac
/// targets.
fn link_clang_runtime_on_macos() {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("macos") {
        return;
    }

    let output = Command::new("xcrun")
        .args(["clang", "--print-resource-dir"])
        .output()
        .expect("run `xcrun clang --print-resource-dir` (needs the Xcode command line tools)");
    assert!(
        output.status.success(),
        "`xcrun clang --print-resource-dir` failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let resource_dir = String::from_utf8(output.stdout).expect("clang resource dir is UTF-8");

    println!(
        "cargo:rustc-link-search=native={}/lib/darwin",
        resource_dir.trim()
    );
    println!("cargo:rustc-link-lib=static=clang_rt.osx");
}
