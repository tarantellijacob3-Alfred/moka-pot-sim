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
