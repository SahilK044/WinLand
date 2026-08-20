# WinLand — Ultra-Fluid Dynamic Island for Windows 🏝️

**WinLand** is a high-performance, hardware-accelerated Dynamic Island desktop experience for Windows, built with React 19, Three.js (WebGL), Vite, and Electron. It brings fluid macOS/iOS-inspired live activities, Samsung One UI 9-style dynamic liquid waves, real-time 3D device hardware connection popups, system telemetry, ambient media controls, camera and microphone privacy indicators, phone call notifications, 240 FPS screen recording with companion floating controls, live weather with place search, and a native macOS Tahoe-style System Settings suite directly to your desktop.

---

## 💾 Downloads & Installation

| Package | Format | Direct Download |
| :--- | :--- | :--- |
| **WinLand Setup 1.1.0** | Windows Setup Installer Wizard | 🚀 **[Download WinLand Setup 1.1.0.exe](https://github.com/SahilK044/WinLand/raw/main/release/WinLand%20Setup%201.1.0.exe)** |
| **WinLand Portable 1.1.0** | Single Standalone Executable | 📦 **[Download WinLand 1.1.0.exe](https://github.com/SahilK044/WinLand/raw/main/release/WinLand%201.1.0.exe)** |

---

## 🌟 Key Features

### 🌊 Samsung One UI 9 Dynamic Wave Progress Bar
- **2 Grand Liquid Wave Layers**: Dual-layer organic wave topography ($18.0\text{px}$ back layer, $14.5\text{px}$ front layer) with non-repeating rolling multi-frequency harmonics.
- **Direct Album-Art Color Fidelity**: Dynamic vertical translucent alpha gradients and ambient luminescence automatically extracted and keyed to the active track's cover art.
- **Ambient Inner Glow & Crest Luminescence**: Luminous 4-stop translucent gradient fill with subtle top-edge rim glow and shadow bloom.
- **Zero React Re-Renders per Frame**: 60/120/144 FPS GPU-accelerated Canvas 2D render loop paired with direct DOM timekeeping to eliminate virtual DOM re-renders during playback.
- **Organic Play/Pause Settling Physics**: Critically damped easing smoothly sinks waves flat into the baseline on pause and rises them upward on playback resume.
- **Adaptive Shoulder Taper & Knob Easing**: Generous $38\text{px}$ adaptive shoulder taper eliminates pinching at the glowing playhead knob.
- **Glassmorphic Floating Seek Tooltip**: High-contrast tabular numeric seek preview with real-time backdrop blur (`backdrop-filter: blur(16px)`).

### 🎥 Screen Studio — 240 FPS Ultra-High Framerate Recording
- **240 FPS Ultra-High Framerate Capture**: Record silky-smooth desktop footage at up to 240 FPS with zero dropped frames and fluid motion fidelity.
- **Zero-Copy GPU Capture Pipeline**: Direct integration with Windows DirectX Desktop Duplication (DXGI) and Windows Graphics Capture (WGC) for hardware frame ingestion with minimal CPU overhead.
- **Dedicated Hardware Transcoding**: Native multi-tier GPU encoding with NVIDIA NVENC (`h264_nvenc`), Intel QuickSync (`h264_qsv`), AMD AMF (`h264_amf`), and multi-threaded CPU fallback (`libx264 ultrafast`).
- **Constant Framerate (CFR) Timestamp Pacing**: Precision timestamp normalization (`-fps_mode cfr`) eliminates micro-stutters and variable framerate jitter.
- **Companion Floating Controls Pill**: Detachable, draggable floating companion bar with live elapsed time, mic/webcam toggles, and instant stop/discard controls.
- **Smart Focus & Cinematic Camera**: Cursor-following zoom with hotkey overrides (`Alt+P` for pan-out, `Alt+Z` for zoom-in).
- **Gliding Spring Framerate Selector**: Segmented framerate switch (`30` ↔ `60` ↔ `120` ↔ `240` FPS) with fluid Framer Motion spring physics.

### ⏱️ Dual Split-Pill Dynamic Island & Multi-Timer Suite
- **Automatic Split Morphing**: Starting a timer automatically morphs the Dynamic Island into a dual split-pill layout with primary playback/clock on the left and active countdown on the right.
- **Drift-Free Wall-Clock Engine**: High-precision `Date.now()` elapsed delta calculation eliminates timer drift when backgrounded or throttled by Windows OS power management.
- **Multi-Timer Management**: Support for simultaneous countdown timers with custom durations, labels, and individual toggle/reset/delete controls.
- **Synthesized Web Audio Alarm**: High-quality synthesized completion chime played on timer expiry with automatic split re-unification.

### 🎵 Ambient Music Player & Synced Karaoke Lyrics
- **Sub-Millisecond Vocal Tracking**: High-precision continuous timekeeper delivers real-time word-by-word tracking.
- **Interactive Vocal Sync Tuning**: On-the-fly vocal offset adjustment (`-0.2s`, `Sync`, `+0.2s`) with persistent local storage.
- **Full-Bleed Soft-Feather Artwork**: Left-anchored album artwork with an 8-stop smooth horizontal gradient mask that blends naturally into the pitch-black capsule.
- **Multi-Provider Lyrics Support**: Karaoke word-wipe lyrics engine with LRCLIB and NetEase Cloud fallback.
- **Integrated System Volume Control**: Inline system volume scrubber with mousewheel support, quick mute toggle, and volume badge OSD.

### 🌤️ Live Weather & Geocoding Search Suite
- **Ground-Truth Surface Observations**: Real-time physical weather station observations powered by high-precision surface meteorological stations and NOAA GFS global models.
- **Interactive Place Search & Autocomplete**: Click the weather widget to search any city, region, or locality globally with instant debounced autocompletion and clean glassmorphism dropdowns.
- **Auto-Expanding Spring Capsule**: The Dynamic Island capsule smoothly expands vertically via Apple fluid spring physics (`cubic-bezier(0.16, 1, 0.3, 1)`) to display search suggestions without clipping or scrollbars.
- **Permanent Location Pinning**: Automatically remembers your chosen location in persistent configuration storage (`settings.json` & `localStorage`), keeping it locked indefinitely across app restarts.
- **Crisp Static Vector Icons**: High-contrast weather palette with static Lucide vector glyphs (`Sun`, `Moon`, `Cloud`, `CloudRain`, `CloudSnow`, `CloudLightning`, `CloudFog`, `CloudSun`).

### ⚙️ macOS Tahoe System Settings Suite
- **Gliding Spring Indicator**: Sidebar categories feature a fluid Framer Motion spring indicator (`stiffness: 500, damping: 38`) that smoothly glides and morphs between selected tabs.
- **Smooth Sidebar Scrolling**: Auto-scrolls categories smoothly into view as you navigate or filter through settings.
- **Animated Content Transitions**: Seamless page fade and subtle vertical slide transitions across all category panes.
- **Multi-Monitor Pinning**: Select which display the Dynamic Island anchors to across multi-monitor setups.
- **Crisp Anti-Aliased Window Borders**: Native border-radius styling with zero corner blur or DWM clipping artifacts.

### 🟢 macOS Camera & Microphone Privacy Indicators
- **Hardware Status Dots**: Vibrant Apple emerald (`#30D158`) and warm amber (`#FF9F0A`) luminous indicator dots that illuminate dynamically whenever any application accesses your webcam or microphone.
- **Interactive Control Center Privacy Card**: Clicking on privacy indicators displays active applications accessing your sensors (e.g., *OBS Studio*, *Discord*, *Zoom*, *Google Chrome*) with real-time status badges.
- **Native Windows Sensor Telemetry**: Continuously queries the Windows `CapabilityAccessManager` subsystem to provide instantaneous detection with zero CPU overhead.

### 🎧 3D WebGL Device Connection Popups & Hardware Adaptation
- **Real-Time Bluetooth & 2.4GHz Detection**: Instantaneous connection and disconnection pop-up notifications for wireless headsets, earbuds, speakers, controllers, and smartphones.
- **Zero-Leak GPU Memory Lifecycle**: Recursive scene graph traversal with explicit GPU disposal (`dispose()`) for geometries, materials, and textures, plus automatic RAF cancellation on disconnection.
- **39 Integrated 3D Hardware Models**:
  - **Audio & Speakers**: Sonos Soundbar, Razer Barracuda Headset, Sony WH-1000XM5, Apple AirPods Max, Apple AirPods Pro, Samsung Galaxy Buds Pro (with individual left/right earbud levitation and animated flip case).
  - **Gaming Peripherals**: PlayStation 5 DualSense Wireless Controller, Xbox Series X/S Wireless Controllers (Carbon Black & Robot White).
  - **Smartphones & Foldables**: 20+ flagship smartphones with authentic geometries and camera arrays:
    - **Samsung Galaxy S & Note Series**: S26 Ultra, S25 Ultra, S24 Ultra, S22 Ultra, S21 Ultra, Note 20 Ultra.
    - **Samsung Galaxy Foldables**: Z Fold 6, Z Fold 2, Z Flip 6, Z Flip 3.
    - **Google Pixel Series**: Pixel 8 Pro, Pixel 7 Pro, Pixel 6 Pro.
    - **Apple iPhone Series**: iPhone 17 Pro, iPhone 17 Air, iPhone 16 Pro, iPhone 16, iPhone 15 Pro, iPhone 15, iPhone 12.

### 📁 Shelf Drop Zone Fluid Absorption & 3D Tilt Card Grid
- **Fluid Ingestion Aura**: Dragging desktop files or shortcuts over the Dynamic Island triggers an energetic blue glass absorption aura (`scale(1.025)`) with ambient edge glow.
- **Magnetic 3D Perspective Card Tilt**: Shelved applications track your cursor in real time with 3D perspective tilt (`rotateX` / `rotateY`) and dynamic radial specular follow spots.
- **High-Definition Icon Extraction**: Extracts authentic application icons from target executables and `.lnk` shortcuts.

### 📞 Phone Link & WhatsApp Call Integration
- **Real-Time Call Detection**: Instantaneous detection of incoming and active phone calls from Windows Phone Link (`PhoneExperienceHost`) and WhatsApp.
- **Interactive Call Card**: Full caller avatar, contact name, duration timer, and green Accept (📞) / red Decline (🚫) controls.
- **Direct Window UIA Contact Extraction**: Native C# UI Automation extracts contact names and numbers directly from UWP XAML elements.

### 🔋 Battery, Power & USB Hub
- **Battery Status & Charging Pill**: Low battery warnings, time-to-full estimations, and charging zap glyphs with color-coded battery health states.
- **USB Device Connection & Safe Eject**: Real-time USB drive attachment notifications with instant one-click safe hardware removal.

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

# Lint & Verify Code Quality
npm run lint

# Build Vite frontend bundle
npm run build

# Package unpacked standalone executable (release/win-unpacked/WinLand.exe)
npm run dist

# Build Windows NSIS Setup Installer Wizard (release/WinLand Setup 1.1.0.exe)
npm run dist:setup

# Build all distribution formats (Installer, Portable, Unpacked)
npm run dist:all
```

---

## 📄 License

MIT License.
