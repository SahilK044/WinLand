# WinLand — Ultra-Fluid Dynamic Island for Windows 🏝️

**WinLand** is a state-of-the-art, interactive Dynamic Island desktop experience for Windows, built with React 19, Three.js (WebGL), Vite, and Electron. It seamlessly integrates with **WinDock** (.NET) to bring fluid macOS Tahoe-inspired widgets, live 3D hardware device connection popups, system telemetry, media controls, and weather forecasts directly to your desktop.

---

## 🌟 Key Features

### 🎧 3D WebGL Device Connection Popups & Hardware Adaptation
- **Real-Time Bluetooth & 2.4GHz Detection**: Instantaneous connection and disconnection pop-up notifications for wireless headsets, earbuds, speakers, and smartphones.
- **Flagship 3D Hardware Models**:
  - **3D Wireless Earbuds**: Ceramic white charging case with backwards flip lid, open-air levitation, and magnetic slot docking.
  - **3D Soundbar**: Anodized space-gray aluminum body with perforated acoustic front grille, metallic chrome trims, and front center LED equalizer lightstrip.
  - **3D Headphones**: 360° showcase spin with physical earcups, metallic headband, and acoustic inner mesh.
  - **Dynamic Smartphone Adaptation**: Automatically detects connected smartphone models:
    - **Samsung Galaxy S24 Ultra**: Sharp boxy titanium frame, centered Infinity-O front camera punch-hole dot, and 5 separate floating rear camera rings directly on glass.
    - **iPhone 15 Pro / 16 Pro / 17 Pro**: Curved titanium frame with Dynamic Island pill cutout and triangular 3-lens camera bump.

### 🎵 System Now-Playing & Live Lyrics
- **Media Controls**: Live track metadata, album artwork, progress bar, play/pause/skip controls via Windows System Media Transport Controls (GSMTC) & Spotify API.
- **Dynamic Accent Glow**: Real-time canvas color sampler extracts dominant colors from current album art to illuminate a smooth glassmorphic gradient background.

### 🌤️ Weather, Battery & System Monitoring
- **Live Weather Sync**: Real-time local temperature and weather status synced automatically via IP geolocation & Open-Meteo API.
- **Battery & Volume OSDs**: Real-time battery status with charging indicator and clean macOS Tahoe typography (no clunky boxes).
- **Fullscreen Auto-Hide**: Detects fullscreen games and media playback to automatically hide the island so it never obstructs your screen.

---

## 🛠️ Architecture & Integration

WinLand runs as a high-performance Electron overlay process integrated with **WinDock**:

```
WinDock (.NET Host) <── %TEMP%\winland_theme.json ──> WinLand (Electron App)
                                                             │
                                                     React 19 + Three.js 3D
```

- `getInitialConfig`: Synchronously fetches weather, theme, and island preferences on component mount.
- `onConfigUpdate`: Receives real-time weather and configuration updates.
- `onBluetoothUpdate`: Real-time Bluetooth & 2.4GHz audio device connection monitoring.
- `onSystemMediaUpdate`: Live Windows media transport metadata.

---

## 🚀 Building & Running

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Commands

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run Electron app in development mode
npm run app

# Build Vite frontend bundle
npm run build

# Package standalone Windows executable (dist_app/win-unpacked/WinLand.exe)
npm run dist
```

---

## 📄 License

MIT License. Designed with visual excellence and performance in mind.
