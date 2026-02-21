// === Moka Pot Thermodynamics Engine ===
// Real physics: heat transfer, phase change, Darcy's law, steam pressure

export interface MokaParams {
  stoveType: 'gas' | 'electric' | 'induction'
  stovePower: number        // watts
  grindSize: number         // 1-10 (fine to coarse)
  potMaterial: 'aluminum' | 'stainless'
  potSize: number           // cups: 1, 3, 6, 9, 12
  altitude: number          // meters above sea level
  startingWaterTemp: number // °C
}

export interface SimulationPoint {
  time: number          // seconds
  waterTemp: number     // °C
  pressure: number      // bar (gauge)
  extractionPct: number // 0-100
  phase: 'heating' | 'brewing' | 'done'
}

// --- Brew Quality ---

export interface BrewQuality {
  score: number   // 0-100
  label: 'Under-extracted' | 'Good' | 'Excellent' | 'Over-extracted' | 'Bitter'
  tip: string
}

// --- Energy Stats ---

export interface EnergyStats {
  totalEnergyIn: number   // joules from stove
  energyToWater: number   // joules heating water
  energyToSteam: number   // joules for phase change
  energyWasted: number    // lost to air/pot
  efficiency: number      // percentage
}

// --- Stove Presets ---

export interface StovePreset {
  name: string
  type: 'gas' | 'electric' | 'induction'
  power: number  // watts
}

export const STOVE_PRESETS: StovePreset[] = [
  { name: 'Gas Range - Low',        type: 'gas',       power: 800  },
  { name: 'Gas Range - Medium',     type: 'gas',       power: 1500 },
  { name: 'Gas Range - High',       type: 'gas',       power: 3000 },
  { name: 'Electric Coil - 4/10',   type: 'electric',  power: 800  },
  { name: 'Electric Coil - 6/10',   type: 'electric',  power: 1200 },
  { name: 'Electric Coil - 8/10',   type: 'electric',  power: 1800 },
  { name: 'Induction - Low',        type: 'induction', power: 500  },
  { name: 'Induction - Medium',     type: 'induction', power: 1000 },
  { name: 'Induction - High',       type: 'induction', power: 1800 },
]

// --- Altitude Presets ---

export interface AltitudePreset {
  name: string
  altitude: number  // meters
}

export const ALTITUDE_PRESETS: AltitudePreset[] = [
  { name: 'Sea Level',    altitude: 0    },
  { name: 'Denver',       altitude: 1609 },
  { name: 'Mexico City',  altitude: 2240 },
  { name: 'Bogotá',       altitude: 2640 },
  { name: 'La Paz',       altitude: 3640 },
]

// Physical constants
const SPECIFIC_HEAT_WATER = 4186    // J/(kg·°C)
const LATENT_HEAT_VAPORIZATION = 2260000 // J/kg
const R_GAS = 8.314                 // J/(mol·K)
const MOLAR_MASS_WATER = 0.018     // kg/mol
const ATM_PRESSURE = 101325         // Pa

// Stove efficiency (heat actually reaching pot bottom)
const STOVE_EFFICIENCY: Record<string, number> = {
  gas: 0.40,
  electric: 0.70,
  induction: 0.85,
}

// Thermal conductivity W/(m·K)
const THERMAL_CONDUCTIVITY: Record<string, number> = {
  aluminum: 205,
  stainless: 16,
}

// Pot sizes → water volume in mL and grounds mass in g
const POT_SPECS: Record<number, { waterMl: number; groundsG: number; heightCm: number }> = {
  1:  { waterMl: 60,  groundsG: 7,  heightCm: 13 },
  3:  { waterMl: 150, groundsG: 17, heightCm: 16 },
  6:  { waterMl: 300, groundsG: 30, heightCm: 21 },
  9:  { waterMl: 450, groundsG: 45, heightCm: 24 },
  12: { waterMl: 600, groundsG: 55, heightCm: 27 },
}

// Grind size to permeability (Darcy's law)
// Fine espresso grind ≈ 1e-12 m², coarse ≈ 1e-10 m²
function grindToPermeability(grindSize: number): number {
  // Logarithmic scale: 1 (finest) to 10 (coarsest)
  const logMin = -12   // 1e-12
  const logMax = -10   // 1e-10
  const logK = logMin + (grindSize - 1) / 9 * (logMax - logMin)
  return Math.pow(10, logK)
}

// Boiling point adjusted for altitude (Clausius-Clapeyron approximation)
export function boilingPoint(altitudeM: number): number {
  // Atmospheric pressure decreases ~12% per 1000m
  const pressureRatio = Math.exp(-altitudeM / 8500)
  const pAtm = ATM_PRESSURE * pressureRatio
  // Clausius-Clapeyron: ΔT ≈ (T_b² × R × ln(P/P0)) / L_v
  const T_b = 373.15 // K (100°C)
  const deltaT = (T_b * T_b * R_GAS * Math.log(pAtm / ATM_PRESSURE)) / (LATENT_HEAT_VAPORIZATION * MOLAR_MASS_WATER)
  return 100 + deltaT
}

// Material heat transfer factor (how fast heat conducts through pot walls)
function materialFactor(material: string): number {
  const k = THERMAL_CONDUCTIVITY[material] || 205
  // Normalize: aluminum = 1.0, stainless = 0.08
  return k / 205
}

// Run full simulation
export function simulate(params: MokaParams): SimulationPoint[] {
  const spec = POT_SPECS[params.potSize] || POT_SPECS[3]
  const waterMassKg = spec.waterMl / 1000
  const boilTemp = boilingPoint(params.altitude)
  const effectivePower = params.stovePower * STOVE_EFFICIENCY[params.stoveType]
  const matFactor = materialFactor(params.potMaterial)
  const permeability = grindToPermeability(params.grindSize)

  // Heat transfer rate considering material conductivity
  // Better conductor = more of the stove power reaches the water
  const heatRate = effectivePower * (0.3 + 0.7 * matFactor) // W

  const dt = 0.5 // time step in seconds
  const points: SimulationPoint[] = []

  let waterTemp = params.startingWaterTemp
  let pressure = 0 // gauge pressure in bar
  let extractionPct = 0
  let steamFraction = 0 // fraction of water turned to steam
  let phase: 'heating' | 'brewing' | 'done' = 'heating'
  let totalWaterExtracted = 0
  const totalWaterToExtract = waterMassKg * 0.85 // ~85% of water passes through

  // Track when extraction completes for early-stop
  let doneTime: number | null = null

  for (let t = 0; t <= 600; t += dt) {
    // Record every second
    if (t % 1 < dt) {
      points.push({
        time: Math.round(t),
        waterTemp: Math.round(waterTemp * 10) / 10,
        pressure: Math.round(pressure * 1000) / 1000,
        extractionPct: Math.round(extractionPct * 10) / 10,
        phase,
      })
    }

    // === ADAPTIVE EARLY STOP ===
    // Once extraction is done, simulate only 10 more seconds then stop
    if (doneTime !== null && t >= doneTime + 10) {
      break
    }

    if (phase === 'done') continue

    // === HEATING PHASE ===
    if (phase === 'heating') {
      // Q = mcΔT → ΔT = Q/(mc) per timestep
      const energyIn = heatRate * dt
      const deltaT = energyIn / (waterMassKg * SPECIFIC_HEAT_WATER)
      waterTemp += deltaT

      // Once we approach boiling, steam starts forming
      if (waterTemp >= boilTemp - 5) {
        // Gradual pressure buildup as water approaches boiling
        // Steam pressure from ideal gas law approximation
        // P = nRT/V, where n increases as more water vaporizes
        steamFraction += (energyIn * 0.1) / (LATENT_HEAT_VAPORIZATION * waterMassKg)
        steamFraction = Math.min(steamFraction, 0.15) // max ~15% of water becomes steam

        // Gauge pressure in bar
        const steamMoles = (steamFraction * waterMassKg) / MOLAR_MASS_WATER
        const chamberVolume = spec.waterMl * 0.3e-6 // ~30% of lower chamber is air space (m³)
        const steamPressureAbs = (steamMoles * R_GAS * (waterTemp + 273.15)) / chamberVolume
        pressure = Math.max(0, (steamPressureAbs - ATM_PRESSURE) / 100000)
      }

      // Brewing starts when pressure is enough to push water through grounds
      // Typical moka pot operates at 1-2 bar gauge
      if (pressure >= 0.5) {
        phase = 'brewing'
      }

      // Cap temperature slightly above boiling
      if (waterTemp > boilTemp + 3) {
        waterTemp = boilTemp + 3
      }
    }

    // === BREWING PHASE ===
    if (phase === 'brewing') {
      // Continue heating
      const energyIn = heatRate * dt
      steamFraction += (energyIn * 0.3) / (LATENT_HEAT_VAPORIZATION * waterMassKg)
      steamFraction = Math.min(steamFraction, 0.3)

      // Update pressure
      const steamMoles = (steamFraction * waterMassKg) / MOLAR_MASS_WATER
      const chamberVolume = spec.waterMl * 0.3e-6
      const steamPressureAbs = (steamMoles * R_GAS * (waterTemp + 273.15)) / chamberVolume
      pressure = Math.max(0, (steamPressureAbs - ATM_PRESSURE) / 100000)
      pressure = Math.min(pressure, 3) // safety valve at ~3 bar

      // Darcy's law: Q = (k × A × ΔP) / (μ × L)
      // k = permeability, A = cross-section, ΔP = pressure drop, μ = viscosity, L = bed length
      const crossSection = Math.PI * Math.pow(0.03, 2) // ~3cm radius filter basket
      const bedLength = 0.015 // ~1.5cm grounds bed
      const viscosity = 0.001 // water viscosity Pa·s
      const deltaPressure = pressure * 100000 // convert bar to Pa

      const flowRate = (permeability * crossSection * deltaPressure) / (viscosity * bedLength) // m³/s
      const waterExtractedThisStep = flowRate * dt * 1000 // kg (density ≈ 1000 kg/m³)

      totalWaterExtracted += waterExtractedThisStep
      extractionPct = Math.min(100, (totalWaterExtracted / totalWaterToExtract) * 100)

      // Temperature stays near boiling during brewing
      waterTemp = Math.min(waterTemp + 0.01, boilTemp + 5)

      if (extractionPct >= 100) {
        phase = 'done'
        extractionPct = 100
        doneTime = t
      }
    }
  }

  return points
}

// Match stove: given a working setup, find equivalent power on new stove
export function matchStove(
  workingParams: MokaParams,
  newStoveType: 'gas' | 'electric' | 'induction'
): number {
  // The key insight: we want the same effective heat rate
  const workingEffective = workingParams.stovePower * STOVE_EFFICIENCY[workingParams.stoveType]
  // Same material factor applies (same pot)
  const requiredPower = workingEffective / STOVE_EFFICIENCY[newStoveType]
  return Math.round(requiredPower)
}

// Get brew time estimate
export function getBrewTime(points: SimulationPoint[]): number {
  const donePoint = points.find(p => p.phase === 'done')
  return donePoint ? donePoint.time : points[points.length - 1]?.time || 0
}

// Get peak pressure
export function getPeakPressure(points: SimulationPoint[]): number {
  return Math.max(...points.map(p => p.pressure))
}

// === Brew Quality Score ===
// Evaluates the simulated brew against ideal moka pot parameters.
// Ideal: 3–5 min brew, peak pressure 1–1.5 bar, water temp ≤ boilTemp + 3°C
export function getBrewQuality(points: SimulationPoint[], params: MokaParams): BrewQuality {
  const brewTimeSec = getBrewTime(points)
  const brewTimeMin = brewTimeSec / 60
  const peakPressure = getPeakPressure(points)
  const boilTemp = boilingPoint(params.altitude)

  // Max water temperature recorded during simulation
  const maxWaterTemp = Math.max(...points.map(p => p.waterTemp))
  const tooHot = maxWaterTemp > boilTemp + 3

  // --- Score components (each 0–100) ---

  // Brew time score: ideal 3–5 min (180–300 s)
  let timeScore: number
  if (brewTimeMin < 1) {
    timeScore = 10
  } else if (brewTimeMin < 3) {
    // Linear ramp from 10 at 1 min to 100 at 3 min
    timeScore = 10 + (brewTimeMin - 1) / 2 * 90
  } else if (brewTimeMin <= 5) {
    timeScore = 100
  } else if (brewTimeMin <= 8) {
    // Linear drop from 100 at 5 min to 30 at 8 min
    timeScore = 100 - (brewTimeMin - 5) / 3 * 70
  } else {
    timeScore = 10
  }

  // Pressure score: ideal 1–1.5 bar
  let pressureScore: number
  if (peakPressure < 0.5) {
    pressureScore = 20
  } else if (peakPressure < 1) {
    // Ramp up to ideal zone
    pressureScore = 20 + (peakPressure - 0.5) / 0.5 * 80
  } else if (peakPressure <= 1.5) {
    pressureScore = 100
  } else if (peakPressure <= 2.5) {
    // Drop toward bitter zone
    pressureScore = 100 - (peakPressure - 1.5) / 1 * 60
  } else {
    pressureScore = 20
  }

  // Temperature score: penalise if water exceeds boilTemp + 3°C
  const tempScore = tooHot ? 50 : 100

  // Weighted composite
  const score = Math.round(timeScore * 0.5 + pressureScore * 0.35 + tempScore * 0.15)
  const clampedScore = Math.max(0, Math.min(100, score))

  // --- Label & tip ---
  let label: BrewQuality['label']
  let tip: string

  if (tooHot && peakPressure > 2) {
    label = 'Bitter'
    tip = 'Water is too hot and pressure too high — lower stove power or pre-heat water less.'
  } else if (brewTimeMin < 2 || (clampedScore < 45 && brewTimeMin < 3)) {
    label = 'Under-extracted'
    tip = 'Brew finished too fast. Try a finer grind or reduce stove power.'
  } else if (peakPressure > 2 || tooHot) {
    label = 'Bitter'
    tip = peakPressure > 2
      ? 'Peak pressure is too high — try a coarser grind or lower stove power.'
      : 'Water temperature exceeded boiling point by too much — reduce stove power.'
  } else if (brewTimeMin > 7) {
    label = 'Over-extracted'
    tip = 'Brew took too long. Try a coarser grind or increase stove power slightly.'
  } else if (clampedScore >= 80) {
    label = 'Excellent'
    tip = 'Perfect brew! Enjoy your coffee.'
  } else if (clampedScore >= 60) {
    label = 'Good'
    tip = brewTimeMin < 3
      ? 'Decent brew — a slightly finer grind would slow things down nicely.'
      : 'Good brew — try adjusting grind size by one step for best results.'
  } else {
    label = 'Under-extracted'
    tip = 'Try a finer grind and make sure the pot is fully sealed.'
  }

  return { score: clampedScore, label, tip }
}

// === Energy Efficiency ===
// Calculates how much stove energy made it into the coffee vs. was wasted.
export function getEnergyStats(points: SimulationPoint[], params: MokaParams): EnergyStats {
  if (points.length === 0) {
    return { totalEnergyIn: 0, energyToWater: 0, energyToSteam: 0, energyWasted: 0, efficiency: 0 }
  }

  const spec = POT_SPECS[params.potSize] || POT_SPECS[3]
  const waterMassKg = spec.waterMl / 1000
  const boilTemp = boilingPoint(params.altitude)
  const effectivePower = params.stovePower * STOVE_EFFICIENCY[params.stoveType]
  const matFactor = materialFactor(params.potMaterial)
  const heatRate = effectivePower * (0.3 + 0.7 * matFactor)

  // Total simulated duration
  const totalTime = points[points.length - 1].time  // seconds
  const totalEnergyIn = params.stovePower * totalTime  // joules drawn from stove (wall power)

  // Energy required to heat all water from starting temp to boiling
  const startTemp = params.startingWaterTemp
  const deltaT = Math.max(0, boilTemp - startTemp)
  const energyToWater = waterMassKg * SPECIFIC_HEAT_WATER * deltaT

  // Energy for steam phase change (~30% of water becomes steam in a real moka pot)
  const steamFraction = 0.15  // conservative estimate of water vaporised
  const energyToSteam = steamFraction * waterMassKg * LATENT_HEAT_VAPORIZATION

  // Energy that actually reached the pot via the stove (at stove efficiency)
  const energyDeliveredToPot = heatRate * totalTime

  // Wasted = total wall energy minus what reached the pot AND was useful
  const usefulEnergy = energyToWater + energyToSteam
  const energyWasted = Math.max(0, totalEnergyIn - usefulEnergy)

  const efficiency = totalEnergyIn > 0
    ? Math.round((usefulEnergy / totalEnergyIn) * 1000) / 10  // one decimal %
    : 0

  // Suppress unused variable warning — energyDeliveredToPot is computed for
  // potential future use (intermediate pot-level efficiency).
  void energyDeliveredToPot

  return {
    totalEnergyIn: Math.round(totalEnergyIn),
    energyToWater: Math.round(energyToWater),
    energyToSteam: Math.round(energyToSteam),
    energyWasted: Math.round(energyWasted),
    efficiency,
  }
}
