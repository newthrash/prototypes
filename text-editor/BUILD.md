# Build Instructions - OpenText Editor

## Prerequisites

### macOS
1. Install Homebrew:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Node.js:
   ```bash
   brew install node
   ```

3. Install Rust:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

### Windows
1. Install Node.js from https://nodejs.org/
2. Install Rust from https://rustup.rs/
3. Install Visual Studio Build Tools with C++ workload

### Linux (Ubuntu/Debian)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install required libraries
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev
```

## Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd text-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri:dev
   ```

   This will:
   - Start the Vite dev server
   - Launch the Tauri application
   - Enable hot reload for development

## Building for Production

### All Platforms
```bash
npm run tauri:build
```

This creates optimized builds for your current platform in:
- `src-tauri/target/release/bundle/`

### Platform-Specific Outputs

#### macOS
- `.app` bundle: `src-tauri/target/release/bundle/macos/OpenText.app`
- `.dmg` installer: `src-tauri/target/release/bundle/dmg/`

#### Windows
- `.msi` installer: `src-tauri/target/release/bundle/msi/`
- `.exe` standalone: `src-tauri/target/release/OpenText.exe`

#### Linux
- `.deb` package: `src-tauri/target/release/bundle/deb/`
- `.AppImage`: `src-tauri/target/release/bundle/appimage/`

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run tauri:dev` | Start Tauri app in dev mode |
| `npm run tauri:build` | Build Tauri app for production |

## Troubleshooting

### macOS "Damaged App" Error
If you see "App is damaged" when running a locally built app:
```bash
xattr -cr src-tauri/target/release/bundle/macos/OpenText.app
```

### Windows Build Failures
Ensure you have:
- Visual Studio 2019 or later with "Desktop development with C++" workload
- Windows 10 SDK

### Linux Missing Dependencies
Install WebKitGTK and other dependencies:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libsoup2.4-dev

# Fedora
sudo dnf install webkit2gtk3-devel openssl-devel gtk3-devel libsoup-devel

# Arch
sudo pacman -S webkit2gtk openssl gtk3 libsoup
```

## Customizing the Build

### Change App Name
Edit `src-tauri/tauri.conf.json`:
```json
{
  "tauri": {
    "bundle": {
      "identifier": "com.yourcompany.appname",
      "productName": "Your App Name"
    }
  }
}
```

### Change Icons
Replace files in `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Generate icons from SVG:
```bash
# Using ImageMagick (install first)
convert icon.svg -resize 32x32 icons/32x32.png
convert icon.svg -resize 128x128 icons/128x128.png
convert icon.svg -resize 256x256 icons/128x128@2x.png
```

### Code Signing

#### macOS
Requires Apple Developer account:
```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"
npm run tauri:build
```

#### Windows
Requires code signing certificate:
```bash
set WINDOWS_CERTIFICATE_PATH=path/to/cert.pfx
set WINDOWS_CERTIFICATE_PASSWORD=yourpassword
npm run tauri:build
```

## Project Scripts

### `package.json` Scripts Explained

```json
{
  "scripts": {
    "dev": "vite",                          // Frontend dev server
    "build": "tsc && vite build",          // Build frontend
    "preview": "vite preview",              // Preview built frontend
    "tauri": "tauri",                       // Tauri CLI access
    "tauri:dev": "tauri dev",               // Full dev mode
    "tauri:build": "tauri build"            // Production build
  }
}
```

## Debugging

### Enable DevTools
In `src-tauri/src/main.rs`:
```rust
#[cfg(debug_assertions)]
{
    let window = app.get_window("main").unwrap();
    window.open_devtools();
}
```

### Frontend DevTools
Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux) when running in dev mode.

### Rust Debugging
Use `cargo` commands directly:
```bash
cd src-tauri
cargo build
cargo run
```

## Performance Optimization

### Reduce Bundle Size
1. Enable tree shaking
2. Use dynamic imports for large components
3. Configure code splitting in Vite

### Optimize Tauri Binary
Add to `src-tauri/Cargo.toml`:
```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

## Distribution

### GitHub Releases
1. Tag your release: `git tag v1.0.0`
2. Push tags: `git push origin v1.0.0`
3. GitHub Actions can auto-build releases

### Manual Distribution
Upload build artifacts from:
- macOS: `.dmg` and `.app`
- Windows: `.msi`
- Linux: `.deb` and `.AppImage`

## Getting Help

- Tauri Docs: https://tauri.app/v1/guides/
- Tauri Discord: https://discord.gg/tauri
- React Docs: https://react.dev/
- Monaco Editor Docs: https://microsoft.github.io/monaco-editor/
