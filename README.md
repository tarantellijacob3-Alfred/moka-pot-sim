# ☕ MokaSim — Moka Pot Thermodynamics Simulator

An interactive web tool that simulates the real physics of moka pot brewing. Adjust parameters, watch the simulation, and find the right stove setting — every time.

## Features

### 📊 Real-Time Simulation
- Animated moka pot cross-section showing water heating, steam pressure building, and coffee extracting
- Live temperature, pressure, and extraction charts
- Playback controls with adjustable speed (1x-50x)

### 🔄 Match My Stove
Save your working stove setup, then find the equivalent power setting on any new stove. Never waste coffee on trial-and-error again.

### 📚 Educational Panels
Expandable sections explaining the thermodynamics behind every step:
- Heat transfer (Q=mcΔT)
- Thermal conductivity (aluminum vs stainless steel)
- Phase change & steam pressure (ideal gas law)
- Boiling point vs altitude (Clausius-Clapeyron)
- Flow through grounds (Darcy's Law)
- Stove efficiency differences

### Adjustable Parameters
- **Stove type:** Gas (40% eff), Electric (70%), Induction (85%)
- **Stove power:** Custom wattage slider
- **Pot size:** 1, 3, 6, 9, or 12-cup
- **Pot material:** Aluminum (205 W/mK) or Stainless Steel (16 W/mK)
- **Grind size:** Fine (espresso) to coarse — maps to permeability via Darcy's law
- **Starting water temp:** Cold to pre-heated
- **Altitude:** Sea level to 4,000m — adjusts boiling point

## Physics Engine

All calculations use real thermodynamic equations:
- `Q = mcΔT` for heating
- Clausius-Clapeyron for altitude-adjusted boiling point
- Ideal gas law (`PV = nRT`) for steam pressure
- Darcy's law (`Q = kAΔP / μL`) for flow through grounds
- Material-specific thermal conductivity factors
- Stove-type efficiency coefficients

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (graphs)
- Zero backend — all physics runs client-side

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
# Output in dist/ — deploy as static site anywhere
```

## Created by

Built for Zac Tarantelli — engineering brain meets coffee nerd.
