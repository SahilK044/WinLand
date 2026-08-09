# WinLand — Ultra-Fluid Dynamic Island for Windows 🏝️

**WinLand** is a state-of-the-art, interactive Dynamic Island desktop experience for Windows, built with React 19, Three.js (WebGL), Vite, and Electron. It seamlessly integrates with **WinDock** (.NET) to bring fluid macOS Tahoe-inspired widgets, live 3D hardware device connection popups, system telemetry, media controls, phone call notifications, system-wide Do Not Disturb integration, and weather forecasts directly to your desktop.

---

## 🌟 Key Features

### 📞 Phone Link & WhatsApp Call Integration
- **Real-Time Call Detection**: Instantaneous detection of incoming and active phone calls from Windows Phone Link (`PhoneExperienceHost`) and WhatsApp.
- **Incoming Call Banner Notification**: Expands into an interactive call card with caller avatar, contact name, duration timer, and green Accept (📞) / red Decline (🚫) controls.
- **Direct Window UIA Contact Extraction**: Uses C# UI Automation to extract exact contact names (`Mom Airtel`) and caller numbers (`555`) directly from UWP XAML elements.
- **Full UTF-8 Unicode & Emoji Support**: Renders caller names with full-color native Unicode emojis (`Suar 🐷🐽`) and emoji-aware initials formatting (`S`).
- **Clean Post-Call Dismissal**: Filters out hidden system background handles (`DDE Server Window`) so the island immediately closes the call card and resumes idle/music view when calls end.

### 🌙 System-Wide Windows 11 Do Not Disturb (DND) Integration
- **Native Action Center Sync**: Directly toggles Windows Action Center (`Win+N`) Focus Assist via Windows Registry (`NOC_GLOBAL_SETTING_TOASTS_ENABLED`).
- **Real-Time OS Polling**: 3-second background polling keeps the island state perfectly in sync whenever DND is toggled from Windows Settings or Action Center.
- **Apple Focus Badge & Spring Animations**: Features dark glassmorphism, lavender moon badge, and smooth Apple spring transitions (`cubic-bezier(0.32, 1.25, 0.36, 1)`).

### ⏱️ Interactive Timer & Alarm Widget
- **Countdown & Progress Ring**: Live remaining time countdown with an animated SVG progress ring and quick-add (+1 min, +5 min) controls.
- **Synthesized Alarm**: Web Audio API synthesized completion chime played upon timer expiry with smooth auto-dismissal.

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
- **Battery & Volume OSDs**: Real-time battery status with charging indicator and clean macOS Tahoe typography.
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
- `onCallUpdate`: Real-time Phone Link & WhatsApp call state notifications.
- `onDndUpdate`: Real-time Windows 11 Focus Assist / Do Not Disturb status.

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

# Package unpacked standalone executable (release/win-unpacked/WinLand.exe)
npm run dist

# Build Windows NSIS Setup Installer Wizard (release/WinLand Setup 1.0.0.exe)
npm run dist:setup

# Build all distribution formats (Installer, Portable, Unpacked)
npm run dist:all
```

---

## 📄 License

MIT License. Designed with visual excellence and performance in mind.
