// === Moka Pot Thermodynamics Engine ===
// Based on: Siregar (2026) arxiv:2601.03663, Navarini et al. (2009), King (2008)
// Validated against real moka pot behavior:
//   - Operating pressure: 1.5-3.5 bar gauge
//   - Extraction temp: 92-96°C at grounds
//   - Flow rate: 1.5-2 mL/s during extraction
//   - Total brew time: 4-6 minutes
//   - Contact time through grounds: 20-30s

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
  flowRate: number      // mL/s
}

export interface BrewQuality {
  score: number
  label: 'Under-extracted' | 'Good' | 'Excellent' | 'Over-extracted' | 'Bitter'
  tip: string
}

export interface EnergyStats {
  totalEnergyIn: number
  energyToWater: number
  energyToSteam: number
  energyWasted: number
  efficiency: number
}

export interface StovePreset {
  name: string
  type: 'gas' | 'electric' | 'induction'
  power: number
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

export interface AltitudePreset {
  name: string
  altitude: number
}

export const ALTITUDE_PRESETS: AltitudePreset[] = [
  { name: 'Sea Level',    altitude: 0    },
  { name: 'Denver',       altitude: 1609 },
  { name: 'Mexico City',  altitude: 2240 },
  { name: 'Bogotá',       altitude: 2640 },
  { name: 'La Paz',       altitude: 3640 },
]

// =====================
// Physical Constants
// =====================
const C_WATER = 4186         // J/(kg·°C) specific heat of water
const L_VAP = 2260000        // J/kg latent heat of vaporization
const R_GAS = 8.314          // J/(mol·K)
const M_WATER = 0.018015     // kg/mol
const P_ATM = 101325         // Pa
const C_ALUMINUM = 897       // J/(kg·°C)
const C_STEEL = 502          // J/(kg·°C)

const STOVE_EFF: Record<string, number> = {
  gas: 0.40,
  electric: 0.70,
  induction: 0.85,
}

const K_THERMAL: Record<string, number> = {
  aluminum: 205,
  stainless: 16,
}

const POT_SPECS: Record<number, {
  waterMl: number
  groundsG: number
  potMassKg: number
  filterRadiusCm: number
  bedThicknessCm: number
  headspaceMl: number     // initial air volume above water in sealed lower chamber
  riserHeightCm: number
}> = {
  1:  { waterMl: 60,  groundsG: 7,  potMassKg: 0.22, filterRadiusCm: 1.5, bedThicknessCm: 0.8, headspaceMl: 12,  riserHeightCm: 4  },
  3:  { waterMl: 150, groundsG: 17, potMassKg: 0.35, filterRadiusCm: 2.2, bedThicknessCm: 1.2, headspaceMl: 20,  riserHeightCm: 6  },
  6:  { waterMl: 300, groundsG: 30, potMassKg: 0.50, filterRadiusCm: 2.8, bedThicknessCm: 1.5, headspaceMl: 30,  riserHeightCm: 8  },
  9:  { waterMl: 450, groundsG: 45, potMassKg: 0.65, filterRadiusCm: 3.2, bedThicknessCm: 1.8, headspaceMl: 40,  riserHeightCm: 10 },
  12: { waterMl: 600, groundsG: 55, potMassKg: 0.80, filterRadiusCm: 3.5, bedThicknessCm: 2.0, headspaceMl: 50,  riserHeightCm: 12 },
}

function grindToPermeability(grindSize: number): number {
  // Calibrated to produce realistic flow rates through Darcy's law:
  //   Grind 1 (extra fine/espresso): ~5e-15 m² → very slow flow, high pressure
  //   Grind 3 (moka ideal, fine salt): ~3.5e-14 m² → ~2 mL/s at 1 bar driving
  //   Grind 5 (medium): ~2.5e-13 m² → fast flow, low pressure
  //   Grind 10 (french press): ~1e-11 m² → nearly unrestricted
  const logMin = -14.3   // extra fine: 5e-15
  const logMax = -11.0   // coarse: 1e-11
  return Math.pow(10, logMin + (grindSize - 1) / 9 * (logMax - logMin))
}

export function boilingPoint(altitudeM: number): number {
  // Clausius-Clapeyron approximation
  const pAtm = P_ATM * Math.exp(-altitudeM / 8500)
  const T_b = 373.15
  const deltaT = (T_b * T_b * R_GAS * Math.log(pAtm / P_ATM)) / (L_VAP * M_WATER)
  return 100 + deltaT
}

function heatLossCoeff(potSize: number): number {
  return 1.0 + 0.3 * Math.sqrt(potSize / 3)
}

// =====================
// Main Simulation
// =====================
export function simulate(params: MokaParams): SimulationPoint[] {
  const spec = POT_SPECS[params.potSize] || POT_SPECS[3]
  const waterMassKg = spec.waterMl / 1000
  const boilTemp = boilingPoint(params.altitude)
  const ambientTemp = 22

  // Heat delivery
  const stoveHeatW = params.stovePower * STOVE_EFF[params.stoveType]
  const kFactor = K_THERMAL[params.potMaterial] / 205
  // How much of delivered heat reaches the water vs pot body
  const waterHeatFraction = 0.4 + 0.6 * kFactor // aluminum: ~1.0, stainless: ~0.45

  // Thermal masses
  const potCp = params.potMaterial === 'aluminum' ? C_ALUMINUM : C_STEEL
  const effectiveThermalMass = waterMassKg * C_WATER + spec.potMassKg * potCp * 0.5

  // Darcy's law
  const permeability = grindToPermeability(params.grindSize)
  const filterArea = Math.PI * Math.pow(spec.filterRadiusCm * 0.01, 2) // m²
  const bedThickness = spec.bedThicknessCm * 0.01 // m

  // Hydrostatic head for riser (ρgh)
  const riserHeight = spec.riserHeightCm * 0.01
  const hydrostaticPa = 960 * 9.81 * riserHeight // ~565 Pa for 6cm

  // Local atm
  const pAtmLocal = P_ATM * Math.exp(-params.altitude / 8500)
  const hLoss = heatLossCoeff(params.potSize)

  const dt = 0.25
  const points: SimulationPoint[] = []

  let waterTemp = params.startingWaterTemp
  let steamMassKg = 0 // accumulated steam mass in headspace
  let extractedMl = 0
  const totalToExtract = spec.waterMl * 0.85
  let phase: 'heating' | 'brewing' | 'done' = 'heating'
  let doneTime: number | null = null
  let currentFlowRate = 0

  for (let t = 0; t <= 720; t += dt) { // max 12 min
    // === PRESSURE MODEL ===
    // The lower chamber is sealed. Pressure comes from:
    // 1. Trapped air (heated by Charles's law: P ∝ T at const V, modified by volume change)
    // 2. Steam (water vapor from boiling, tracked explicitly)
    //
    // The moka pot reaches 1.5-3.5 bar because the small headspace gets pressurized
    // rapidly once boiling starts and steam production is continuous.

    // Headspace volume: initial air + volume freed by extracted water
    const headspaceMl = spec.headspaceMl + extractedMl
    const headspaceM3 = headspaceMl * 1e-6

    // 1. Air partial pressure (ideal gas, heated in sealed container)
    // P_air = P_atm × (T/T0) × (V0/V)
    const pAir = pAtmLocal *
      ((waterTemp + 273.15) / (ambientTemp + 273.15)) *
      (spec.headspaceMl / headspaceMl)

    // 2. Steam partial pressure (ideal gas law: PV = nRT)
    const steamMoles = steamMassKg / M_WATER
    const pSteam = steamMoles > 0
      ? (steamMoles * R_GAS * (waterTemp + 273.15)) / headspaceM3
      : 0

    // Total absolute pressure
    const chamberPa = pAir + pSteam

    // Gauge pressure
    let gaugePa = Math.max(0, chamberPa - pAtmLocal)
    // Safety valve at 3.5 bar
    if (gaugePa > 3.5e5) {
      gaugePa = 3.5e5
      // Vent excess steam
      const targetPa = pAtmLocal + 3.5e5
      const targetSteamPa = targetPa - pAir
      if (targetSteamPa > 0 && headspaceM3 > 0) {
        steamMassKg = (targetSteamPa * headspaceM3 * M_WATER) / (R_GAS * (waterTemp + 273.15))
      }
    }
    const gaugePressureBar = gaugePa / 1e5

    // === FLOW (Darcy's Law) ===
    // Real moka pot needs ~0.5-1.0 bar gauge to push water through:
    //   - Hydrostatic head: ~0.05-0.12 bar (small)
    //   - Coffee bed resistance: the main resistance
    //   - Seal friction: ~0.05 bar
    // We model it as: flow starts when gauge > hydrostatic + seal threshold
    // The coffee bed itself acts as a significant barrier. Water must overcome:
    // - Hydrostatic head (~0.06 bar for 6cm)
    // - Coffee bed capillary pressure (the bed resists initial wetting)
    // - Seal friction (~0.1 bar)
    // Total is typically 0.7-1.0 bar for a properly packed moka pot
    // This means flow only starts once significant steam is present
    const sealFrictionPa = 8000 // ~0.08 bar
    const bedCapillaryPa = 45000 // ~0.45 bar initial capillary/wetting resistance
    const thresholdPa = hydrostaticPa + sealFrictionPa + bedCapillaryPa

    const drivingPa = Math.max(0, gaugePa - thresholdPa)
    let flowRateM3s = 0

    // Hot water viscosity varies with temperature
    // ~0.001 Pa·s at 20°C, ~0.0003 Pa·s at 95°C
    const viscosity = 0.001 * Math.exp(-0.02 * (waterTemp - 20))

    if (drivingPa > 0 && extractedMl < totalToExtract) {
      // Q = (k × A × ΔP) / (μ × L)
      flowRateM3s = (permeability * filterArea * drivingPa) / (viscosity * bedThickness)
      // Real moka pot max flow: ~5 mL/s at peak (most extraction at 1.5-2 mL/s)
      flowRateM3s = Math.min(flowRateM3s, 5e-6)
    }
    currentFlowRate = flowRateM3s * 1e6

    // Record every 1 second
    if (Math.abs(t % 1) < dt * 0.5 || t === 0) {
      points.push({
        time: Math.round(t),
        waterTemp: Math.round(waterTemp * 10) / 10,
        pressure: Math.round(gaugePressureBar * 1000) / 1000,
        extractionPct: Math.round(Math.min(100, (extractedMl / totalToExtract) * 100) * 10) / 10,
        phase,
        flowRate: Math.round(currentFlowRate * 100) / 100,
      })
    }

    if (doneTime !== null && t >= doneTime + 15) break
    if (phase === 'done') continue

    // Phase transition
    if (currentFlowRate > 0.01 && phase === 'heating') {
      phase = 'brewing'
    }

    // === HEAT TRANSFER ===
    const heatToWater = stoveHeatW * waterHeatFraction * dt
    const heatLost = hLoss * Math.max(0, waterTemp - ambientTemp) * dt
    const netHeat = heatToWater - heatLost

    if (waterTemp < boilTemp - 0.5) {
      // Below boiling: heat raises temperature
      waterTemp += netHeat / effectiveThermalMass
      waterTemp = Math.max(waterTemp, params.startingWaterTemp)

      // Tiny evaporation below boiling (negligible but physically correct)
      if (waterTemp > 60) {
        const evapRate = 1e-7 * ((waterTemp - 60) / 40) // tiny kg/s
        steamMassKg += evapRate * dt
      }
    } else {
      // At/above boiling: energy goes primarily to steam production
      // This is the key driver of pressure in the moka pot.
      // The water temperature barely rises above boiling because
      // energy is consumed by the phase change (latent heat).

      // Energy partition at/above boiling in sealed moka pot:
      // ~5% raises temperature slightly (superheating in pressurized vessel)
      // ~65% goes to steam production (drives the extraction)
      // ~30% lost to environment (radiation, heating upper chamber, conduction)
      const tempRiseFraction = 0.05
      const envLossFraction = 0.60
      const tempEnergy = netHeat * tempRiseFraction
      waterTemp += tempEnergy / effectiveThermalMass
      waterTemp = Math.min(waterTemp, boilTemp + 5) // max overshoot in sealed vessel

      // Steam production with flow feedback:
      // When water flows out, it carries some energy away. But the key point is:
      // the flowing water was ALREADY hot (near boiling) — it doesn't remove much
      // energy beyond what's already in it. The main feedback is that as water exits,
      // the headspace grows, so more steam is needed to maintain pressure.
      // Small convective loss: only the differential between exit temp and entry temp matters
      const flowLossW = currentFlowRate * 1e-6 * 1000 * C_WATER * 5 // ~5°C differential
      const flowLossEnergy = flowLossW * dt
      const steamFractionOfHeat = 1 - tempRiseFraction - envLossFraction
      const availableForSteam = Math.max(0, netHeat * steamFractionOfHeat - flowLossEnergy)

      if (availableForSteam > 0) {
        steamMassKg += availableForSteam / L_VAP
      }

      // Steam condenses on cooler pot walls (upper chamber is cooler than boiling water)
      // This is a significant effect in real moka pots — the upper chamber acts as a condenser
      // Rate proportional to steam mass and temperature differential
      // Condensation on cooler upper chamber walls — moderate rate
      // In real moka pot: upper chamber heats up during brewing, reducing condensation over time
      const potSurfaceFactor = 0.8 + 0.2 * (params.potSize / 6)
      const condensationRate = steamMassKg * 0.10 * potSurfaceFactor * dt
      steamMassKg = Math.max(0, steamMassKg - condensationRate)
    }

    // === EXTRACTION ===
    if (currentFlowRate > 0) {
      extractedMl += currentFlowRate * dt
      if (extractedMl >= totalToExtract) {
        extractedMl = totalToExtract
        phase = 'done'
        doneTime = t
      }
    }
  }

  return points
}

// Match stove
export function matchStove(
  workingParams: MokaParams,
  newStoveType: 'gas' | 'electric' | 'induction'
): number {
  const workingEffective = workingParams.stovePower * STOVE_EFF[workingParams.stoveType]
  return Math.round(workingEffective / STOVE_EFF[newStoveType])
}

export function getBrewTime(points: SimulationPoint[]): number {
  const donePoint = points.find(p => p.phase === 'done')
  return donePoint ? donePoint.time : points[points.length - 1]?.time || 0
}

export function getPeakPressure(points: SimulationPoint[]): number {
  if (points.length === 0) return 0
  return Math.max(...points.map(p => p.pressure))
}

export function getBrewQuality(points: SimulationPoint[], params: MokaParams): BrewQuality {
  if (points.length === 0) return { score: 0, label: 'Under-extracted', tip: 'No simulation data.' }

  const brewTimeSec = getBrewTime(points)
  const brewTimeMin = brewTimeSec / 60
  const peakPressure = getPeakPressure(points)
  const boilTemp = boilingPoint(params.altitude)
  const maxTemp = Math.max(...points.map(p => p.waterTemp))

  const brewingPoints = points.filter(p => p.phase === 'brewing')
  const avgFlowRate = brewingPoints.length > 0
    ? brewingPoints.reduce((sum, p) => sum + p.flowRate, 0) / brewingPoints.length : 0

  // Total time: ideal 4-6 min
  let timeScore: number
  if (brewTimeMin < 2) timeScore = 15
  else if (brewTimeMin < 4) timeScore = 15 + (brewTimeMin - 2) / 2 * 85
  else if (brewTimeMin <= 6) timeScore = 100
  else if (brewTimeMin <= 8) timeScore = 100 - (brewTimeMin - 6) / 2 * 50
  else timeScore = 20

  // Pressure: ideal 1-2 bar
  let pressureScore: number
  if (peakPressure < 0.5) pressureScore = 20
  else if (peakPressure < 1) pressureScore = 20 + (peakPressure - 0.5) / 0.5 * 80
  else if (peakPressure <= 2) pressureScore = 100
  else if (peakPressure <= 3) pressureScore = 100 - (peakPressure - 2) * 40
  else pressureScore = 30

  // Temp: ideal 92-102°C (slightly above boiling is normal in pressurized moka pot)
  let tempScore: number
  if (maxTemp < 85) tempScore = 30
  else if (maxTemp < 92) tempScore = 30 + (maxTemp - 85) / 7 * 70
  else if (maxTemp <= 102) tempScore = 100
  else if (maxTemp <= 105) tempScore = 100 - (maxTemp - 102) / 3 * 40
  else tempScore = 40

  // Flow: ideal 1.5-2.5 mL/s
  let flowScore = 100
  if (avgFlowRate < 0.5) flowScore = 30
  else if (avgFlowRate < 1.5) flowScore = 30 + (avgFlowRate - 0.5) * 70
  else if (avgFlowRate <= 2.5) flowScore = 100
  else if (avgFlowRate <= 4) flowScore = 100 - (avgFlowRate - 2.5) / 1.5 * 50
  else flowScore = 30

  const score = Math.round(timeScore * 0.35 + pressureScore * 0.25 + tempScore * 0.2 + flowScore * 0.2)
  const clampedScore = Math.max(0, Math.min(100, score))

  // Label based on score first, with overrides only for extreme conditions
  let label: BrewQuality['label']
  let tip: string

  if (clampedScore >= 80) {
    label = 'Excellent'
    tip = 'Sweet spot! Rich, balanced coffee with bright acidity and nutty/caramel notes.'
    // Minor suggestions even when excellent
    if (peakPressure > 2.5) tip += ' Tip: slightly lower heat could smooth out the flavor.'
    if (avgFlowRate < 1.0) tip += ' Tip: a slightly coarser grind would improve flow.'
  } else if (clampedScore >= 60) {
    label = 'Good'
    if (brewTimeMin < 2.5) {
      tip = 'Brew is a bit fast. Try lower heat or finer grind for more body.'
    } else if (brewTimeMin > 7) {
      tip = 'Taking a bit long. Try slightly higher heat or coarser grind.'
    } else if (peakPressure > 2.5) {
      tip = 'Pressure is high — a coarser grind or lower heat would help.'
    } else if (avgFlowRate < 1.0) {
      tip = 'Flow is slow — a slightly coarser grind would improve extraction.'
    } else if (avgFlowRate > 3.0) {
      tip = 'Flow is fast — a finer grind would slow it down and add body.'
    } else {
      tip = 'Close to perfect — fine-tune grind or heat by one step.'
    }
  } else if (clampedScore >= 40) {
    // Determine primary issue
    if (maxTemp > boilTemp + 5 && peakPressure > 2.5) {
      label = 'Bitter'
      tip = 'Too hot & too much pressure. Reduce heat significantly. Try pre-heating water to 80°C.'
    } else if (peakPressure > 3.0) {
      label = 'Bitter'
      tip = 'Pressure way too high — use a coarser grind or lower heat.'
    } else if (brewTimeMin < 2) {
      label = 'Under-extracted'
      tip = 'Too fast — use a finer grind (2-3) or lower heat for more contact time.'
    } else if (brewTimeMin > 8) {
      label = 'Over-extracted'
      tip = 'Way too slow — coarser grind or higher heat. Try pre-heating your water.'
    } else {
      label = 'Under-extracted'
      tip = 'Use a finer grind (3-4 for moka, like fine salt) and ensure a tight seal.'
    }
  } else {
    // Very low score
    if (brewTimeMin > 8) {
      label = 'Over-extracted'
      tip = 'Brew took far too long. Use higher heat and coarser grind. Check your seal.'
    } else if (brewTimeMin < 2) {
      label = 'Under-extracted'
      tip = 'Way too fast — much finer grind needed, or significantly reduce heat.'
    } else if (peakPressure > 3.0) {
      label = 'Bitter'
      tip = 'Extreme pressure — use a much coarser grind and reduce heat.'
    } else {
      label = 'Under-extracted'
      tip = 'Poor extraction. Check grind (should be fine like salt), seal, and heat level.'
    }
  }

  return { score: clampedScore, label, tip }
}

export function getEnergyStats(points: SimulationPoint[], params: MokaParams): EnergyStats {
  if (points.length === 0) {
    return { totalEnergyIn: 0, energyToWater: 0, energyToSteam: 0, energyWasted: 0, efficiency: 0 }
  }

  const spec = POT_SPECS[params.potSize] || POT_SPECS[3]
  const waterMassKg = spec.waterMl / 1000
  const totalTime = points[points.length - 1].time
  const totalEnergyIn = params.stovePower * totalTime

  const peakTemp = Math.max(...points.map(p => p.waterTemp))
  const deltaT = Math.max(0, peakTemp - params.startingWaterTemp)
  const energyToWater = waterMassKg * C_WATER * deltaT

  const potCp = params.potMaterial === 'aluminum' ? C_ALUMINUM : C_STEEL
  const energyToPot = spec.potMassKg * potCp * deltaT

  const steamFraction = 0.12
  const energyToSteam = steamFraction * waterMassKg * L_VAP

  const usefulEnergy = energyToWater + energyToSteam + energyToPot
  const energyWasted = Math.max(0, totalEnergyIn - usefulEnergy)
  const efficiency = totalEnergyIn > 0
    ? Math.round((usefulEnergy / totalEnergyIn) * 1000) / 10 : 0

  return {
    totalEnergyIn: Math.round(totalEnergyIn),
    energyToWater: Math.round(energyToWater),
    energyToSteam: Math.round(energyToSteam),
    energyWasted: Math.round(energyWasted),
    efficiency,
  }
}
