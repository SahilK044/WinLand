# WinLand — Ultra-Fluid Dynamic Island for Windows 🏝️

**WinLand** is a high-performance, interactive Dynamic Island desktop experience for Windows, built with React 19, Three.js (WebGL), Vite, and Electron. It brings fluid macOS-inspired live activities, hardware connection notifications with real-time 3D device models, system telemetry, ambient media controls, phone call notifications, system-wide Do Not Disturb integration, smart screen recording, and live weather directly to your desktop.

---

## 💾 Downloads & Installation

| Package | Format | Direct Download |
| :--- | :--- | :--- |
| **WinLand Setup 1.0.0** | Windows Setup Installer Wizard | 🚀 **[Download WinLand Setup 1.0.0.exe](https://github.com/SahilK044/WinLand/raw/main/release/WinLand%20Setup%201.0.0.exe)** |
| **WinLand Portable 1.0.0** | Single Standalone Executable | 📦 **[Download WinLand 1.0.0.exe](https://github.com/SahilK044/WinLand/raw/main/release/WinLand%201.0.0.exe)** |

---

## 🌟 Key Features

### 🎧 3D WebGL Device Connection Popups & Hardware Adaptation
- **Real-Time Bluetooth & 2.4GHz Detection**: Instantaneous connection and disconnection pop-up notifications for wireless headsets, earbuds, speakers, controllers, and smartphones.
- **39 Integrated 3D Hardware Models**:
  - **Audio & Speakers**: Sonos Soundbar, Razer Barracuda Headset, Sony WH-1000XM5, Apple AirPods Max, Apple AirPods Pro, Samsung Galaxy Buds Pro (with individual left/right earbud levitation and animated flip case).
  - **Gaming Peripherals**: PlayStation 5 DualSense Wireless Controller, Xbox Series X/S Wireless Controllers (Carbon Black & Robot White).
  - **Smartphones & Foldables**: 20+ flagship smartphones with authentic geometries and camera arrays:
    - **Samsung Galaxy S & Note Series**: S26 Ultra, S25 Ultra, S24 Ultra, S22 Ultra, S21 Ultra, Note 20 Ultra.
    - **Samsung Galaxy Foldables**: Z Fold 6, Z Fold 2, Z Flip 6, Z Flip 3.
    - **Google Pixel Series**: Pixel 8 Pro, Pixel 7 Pro, Pixel 6 Pro.
    - **Apple iPhone Series**: iPhone 17 Pro, iPhone 17 Air, iPhone 16 Pro, iPhone 16, iPhone 15 Pro, iPhone 15, iPhone 12.

### 🎵 Ambient Music Player & Synced Lyrics
- **Full-Bleed Soft-Feather Artwork**: Left-anchored album artwork with an 8-stop smooth horizontal gradient mask that blends naturally into the deep pitch-black capsule.
- **60/120 FPS Continuous Progress Bar**: Sub-pixel smooth scrubber engine powered by native display `requestAnimationFrame` interpolation.
- **Dual-Layer Track Crossfades**: Exiting songs dissolve smoothly over 650ms while incoming artwork fades in with a micro-zoom ease.
- **Adaptive Contrast Controls**: Automatically analyzes cover art luminance to ensure transport buttons and scrubber controls maintain high contrast.
- **Multi-Provider Synced Lyrics**: 5-stage karaoke word-wipe lyrics engine with LRCLIB, Lyrics.ovh, and NetEase Cloud fallback.
- **System Master Volume Control**: Integrated inline volume slider with mousewheel support and quick mute toggle.

### 📞 Phone Link & WhatsApp Call Integration
- **Real-Time Call Detection**: Instantaneous detection of incoming and active phone calls from Windows Phone Link (`PhoneExperienceHost`) and WhatsApp.
- **Interactive Call Card**: Full caller avatar, contact name, duration timer, and green Accept (📞) / red Decline (🚫) controls.
- **Direct Window UIA Contact Extraction**: Native C# UI Automation extracts contact names and numbers directly from UWP XAML elements.
- **Unicode & Emoji Support**: Renders caller names with full-color native Unicode emojis and initials formatting.

### 🌙 System-Wide Windows 11 Do Not Disturb (DND) Integration
- **Native Focus Assist Sync**: Directly toggles Windows Action Center Focus Assist via Windows Registry.
- **Spring Animations**: Lavender moon badge and smooth spring expand/collapse transitions.

### ⏱️ Interactive Timer & Alarm Widget
- **Countdown & Progress Ring**: Live remaining time countdown with an animated SVG progress ring and quick-add (+1 min, +5 min) controls.
- **Synthesized Alarm**: Web Audio API synthesized completion chime played upon timer expiry with smooth auto-dismissal.

### 📂 Desktop Shelf — Drag & Drop App Launcher
- **Drag & Drop to Hold**: Drag desktop shortcuts, files, or folders onto the island to temporarily shelve them in an expandable tile grid.
- **Native App Icon Extraction**: Dereferences Windows `.lnk` and `.url` shortcuts to extract authentic high-definition application icons from target executables.
- **One-Click Launch**: Click any shelved item to instantly open it; clear all items with a single click.

### 🎥 Screen Studio — Screen Recording Suite
- **Custom Resolution & Framerates**: Record desktop activity in crisp 1080p, 1440p, or native 4K at up to 120 FPS.
- **High-Fidelity 48kHz Stereo System Audio**: Captures desktop audio loopback without WebRTC echo cancellation ducking or mono downmixing.
- **Smart Focus & Cinematic Camera**: Cursor-following zoom with hotkey overrides (`P` for pan-out, `Z` for zoom-in).
- **Compact Island Controls**: Live timer, pause/resume toggle, and stop controls embedded directly in the notch pill.

### 🌤️ Weather, Battery & System Monitoring
- **Live Weather Sync**: Real-time local temperature and weather status synced automatically via IP geolocation & Open-Meteo API.
- **Battery & Volume OSDs**: Real-time battery status with charging indicator and clean typography.
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

MIT License.
