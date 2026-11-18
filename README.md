# VERTEX CAD — Hybrid Mini Data Center Case Builder

A 3-module Web-Based CAD & Live IoT Visualizer built for designing, fabricating (Laser Cut + 3D Print), and simulating a **Dual-Bay Hybrid Mini Data Center Case** (custom PC + stacked Laptops + ESP32 IoT safety & cooling controller).

## Tech Stack
- **Framework:** Vite + React 19 + TypeScript + Tailwind CSS v4
- **State Management:** Zustand (`src/store/useCadStore.ts`) — millimeter single source of truth across 2D, 3D, Export, and Live IoT Sync
- **2D Engine:** React-Konva (Module 1 Laser-Cut Sketcher & Module 3 Interactive Wiring Schematic)
- **3D Engine:** React Three Fiber (R3F) + `@react-three/drei` + Three.js
- **3D CSG Engine:** `three-bvh-csg` (watertight real-time parametric boolean operations)
- **Exporters:** 1:1 mm precision `.SVG` (Laser Cut) & Z-up support-free `.STL` (`STLExporter`)

## Modules
1. **Acrylic Case Builder (2D → 3D Assembly — 12 Panels):**
   - Dual-Bay layout: Left PC Bay (2× 140mm top/bottom) + Right 2-Tier Laptop Bay (4× 120mm top/bottom + 2× middle shelf pass-through).
   - Slim matte-black 3D fan shrouds, extended 45° chamfered acrylic legs, U-track bottom slide-in dust filter rail + animated pull-out tray, rear wiring chamber with 10-slot acrylic cable comb, smooth 60fps double-hinged French Doors, and Ice Blue (`#A0E6FF`) LED simulation.
2. **Parametric IoT Box & Shroud Builder (CSG → STL):**
   - Unified Midnight rounded IoT enclosure (Front 0.96" OLED, Left intake louvers, Right 40mm 5V cross-flow fan, 4× ESP32 standoffs, rear wall mounts) + 1-click presets for slim `120mm` and `140mm` through-airflow fan shrouds.
3. **IoT Wiring & Visualizer (2D Schematic + 3D Internal Live Sync):**
   - Zero-resistor, zero-solder ESP32 38-Pin Screw Terminal architecture using a 4-Channel Logic Level Shifter, 4-Channel 5V Relay (zone ON/OFF + MQ-2 Fire Cut-Off), 3× DHT22, 2× MC-38 door magnetic switches, Active Buzzer 5V, OLED 0.96", WS2812B, and independent 12V 5A Adaptor + XL4015 5V Buck Converter.
   - Live-synced with Module 1's 3D fans, French Doors, and LED alert colors.

## Getting Started
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```
