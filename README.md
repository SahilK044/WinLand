# WinLand — Ultra-Fluid Dynamic Island for Windows 🏝️

**WinLand** is a high-performance, hardware-accelerated Dynamic Island desktop experience for Windows, built with React 19, Three.js (WebGL), Vite, and Electron. It brings fluid macOS/iOS-inspired live activities, real-time 3D device hardware connection popups, system telemetry, ambient media controls, camera and microphone privacy indicators, phone call notifications, Focus Assist integration, screen recording, live weather with place search, and a native macOS Tahoe-style System Settings suite directly to your desktop.

---

## 💾 Downloads & Installation

| Package | Format | Direct Download |
| :--- | :--- | :--- |
| **WinLand Setup 1.0.0** | Windows Setup Installer Wizard | 🚀 **[Download WinLand Setup 1.0.0.exe](https://github.com/SahilK044/WinLand/raw/main/release/WinLand%20Setup%201.0.0.exe)** |
| **WinLand Portable 1.0.0** | Single Standalone Executable | 📦 **[Download WinLand 1.0.0.exe](https://github.com/SahilK044/WinLand/raw/main/release/WinLand%201.0.0.exe)** |

---

## 🌟 Key Features

### 🌤️ Live Weather & Geocoding Search Suite
- **Ground-Truth METAR Surface Observations**: Real-time physical weather station observations powered by high-precision surface meteorological stations and NOAA GFS global models.
- **Interactive Place Search & Autocomplete**: Click the weather widget to search any city, region, or locality globally with instant debounced autocompletion and clean glassmorphism dropdowns.
- **Auto-Expanding Spring Capsule**: The Dynamic Island capsule smoothly expands vertically via Apple fluid spring physics (`cubic-bezier(0.16, 1, 0.3, 1)`) to display search suggestions without clipping or scrollbars.
- **Permanent Location Pinning**: Automatically remembers your chosen location in persistent configuration storage (`settings.json` & `localStorage`), keeping it locked indefinitely across app restarts.
- **Crisp Static Vector Icons**: High-contrast, authentic Apple iOS weather palette with static Lucide vector glyphs (`Sun`, `Moon`, `Cloud`, `CloudRain`, `CloudSnow`, `CloudLightning`, `CloudFog`, `CloudSun`).

### ⚙️ macOS Tahoe System Settings Suite
- **Gliding Spring Indicator**: Sidebar categories feature a fluid Framer Motion spring indicator (`stiffness: 500, damping: 38`) that smoothly glides and morphs between selected tabs.
- **Smooth Sidebar Scrolling**: Auto-scrolls categories smoothly into view as you navigate or filter through settings.
- **Animated Content Transitions**: Seamless page fade and subtle vertical slide transitions across all category panes.
- **Crisp Anti-Aliased Window Borders**: Native border-radius styling with zero corner blur or DWM clipping artifacts.
- **Branded Identity**: Displays the official high-resolution WinLand logo in the settings titlebar and About view.

### 🟢 macOS Camera & Microphone Privacy Indicators
- **Hardware Status Dots**: Vibrant Apple emerald (`#30D158`) and warm amber (`#FF9F0A`) luminous indicator dots that illuminate dynamically whenever any application accesses your webcam or microphone.
- **Interactive Control Center Privacy Card**: Clicking on privacy indicators displays active applications accessing your sensors (e.g., *OBS Studio*, *Discord*, *Zoom*, *Google Chrome*) with real-time status badges.
- **Native Windows Sensor Telemetry**: Continuously queries the Windows `CapabilityAccessManager` subsystem to provide instantaneous detection with zero CPU overhead.

### 🌊 Fluid "Squish & Stretch" Spring Physics
- **Volume-Conserving Elastic Dynamics**: When morphing between compact (`310×44`) and expanded activity views (`356×156` / `480×120`), the capsule conserves physical volume by momentarily compressing vertically as it stretches horizontally, followed by cushioned spring settling (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Synchronized Content Spring Fade**: Internal widgets smoothly scale (`0.96 -> 1.0`) with synchronized alpha crossfading to eliminate layout jitter.

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

### 🎵 Ambient Music Player & Synced Karaoke Lyrics
- **Full-Bleed Soft-Feather Artwork**: Left-anchored album artwork with an 8-stop smooth horizontal gradient mask that blends naturally into the deep pitch-black capsule.
- **60/120 FPS Continuous Progress Bar**: Sub-pixel smooth scrubber engine powered by native display `requestAnimationFrame` interpolation.
- **Dual-Layer Track Crossfades**: Exiting songs dissolve smoothly over 650ms while incoming artwork fades in with a micro-zoom ease.
- **Multi-Provider Synced Lyrics**: 5-stage karaoke word-wipe lyrics engine with LRCLIB, Lyrics.ovh, and NetEase Cloud fallback.
- **System Master Volume Control**: Integrated inline volume slider with mousewheel support and quick mute toggle.

### 📁 Shelf Drop Zone Fluid Absorption & 3D Tilt Card Grid
- **Fluid Ingestion Aura**: Dragging desktop files or shortcuts over the Dynamic Island triggers an energetic blue glass absorption aura (`scale(1.025)`) with ambient edge glow.
- **Magnetic 3D Perspective Card Tilt**: Shelved applications track your cursor in real time with 3D perspective tilt (`rotateX` / `rotateY`) and dynamic radial specular follow spots.
- **High-Definition Icon Extraction**: Extracts authentic application icons from target executables and `.lnk` shortcuts.

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

### 🎥 Screen Studio — Screen Recording Suite
- **Custom Resolution & Framerates**: Record desktop activity in crisp 1080p, 1440p, or native 4K at up to 120 FPS.
- **High-Fidelity 48kHz Stereo System Audio**: Captures desktop audio loopback without WebRTC echo cancellation ducking or mono downmixing.
- **Smart Focus & Cinematic Camera**: Cursor-following zoom with hotkey overrides (`P` for pan-out, `Z` for zoom-in).
- **Compact Island Controls**: Live timer, pause/resume toggle, and stop controls embedded directly in the notch pill.

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
- `onPrivacySensorsUpdate`: Real-time webcam and microphone active usage detection.
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
