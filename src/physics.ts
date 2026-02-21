// === Moka Pot Thermodynamics Engine ===
// Based on: Siregar (2026) arxiv:2601.03663 "A Minimal Thermo-Fluid Model
//           for Pressure-Driven Extraction in a Moka Pot"
//           Navarini et al. (2009) "Experimental investigation of steam pressure
//           coffee extraction in a stove-top coffee maker"
//           Gianino (2007) "Experimental analysis of the Italian coffee pot moka"
//
// Key physics (validated against research):
//   - Extraction onset at ~60-70°C (compressed air drives early flow, NOT boiling)
//   - Operating pressure: 1.0-2.5 bar gauge
//   - Extraction completes before water reaches 100°C in most cases
//   - Total brew time: 4-6 minutes
//   - Flow rate: 1-3 mL/s during peak extraction
//   - Pressure is from BOTH trapped air expansion AND water vapor

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
const R_GAS = 8.314          // J/(mol·K) universal gas constant
const M_WATER = 0.018015     // kg/mol molar mass of water
// const M_AIR = 0.029       // kg/mol molar mass of air (unused)
const P_ATM = 101325         // Pa standard atmospheric pressure
const C_ALUMINUM = 897       // J/(kg·°C) specific heat of aluminum
const C_STEEL = 502          // J/(kg·°C) specific heat of stainless steel
const RHO_WATER = 990        // kg/m³ hot water density (~90°C)

const STOVE_EFF: Record<string, number> = {
  gas: 0.40,        // ~40% of flame reaches pot bottom
  electric: 0.70,   // ~70% via conduction
  induction: 0.85,  // ~85% direct electromagnetic heating
}

const K_THERMAL: Record<string, number> = {
  aluminum: 205,    // W/(m·K) — excellent heat conductor
  stainless: 16,    // W/(m·K) — much slower heat transfer
}

const POT_SPECS: Record<number, {
  waterMl: number         // water volume in lower chamber
  groundsG: number        // coffee grounds mass
  potMassKg: number       // mass of aluminum/steel body
  filterRadiusCm: number  // radius of coffee basket
  bedThicknessCm: number  // depth of coffee bed
  headspaceMl: number     // initial air volume above water (sealed)
  riserHeightCm: number   // vertical height water must rise
}> = {
  // Headspace: trapped air above water line in the sealed boiler.
  // Instructions say "fill to just below the safety valve" — meaning the
  // headspace is VERY small: ~2-4% of boiler volume. This tiny trapped
  // air volume is what allows rapid pressurization (P ∝ T/V, small V).
  //
  // Navarini (2009): "the initial amount of dry air in the kettle" is a
  // key variable; less air → slower pressure rise but higher final pressure.
  //
  // Note: the funnel stem also traps a small amount of air, but this is
  // in communication with the coffee bed and contributes to the initial push.
  1:  { waterMl: 60,  groundsG: 7,  potMassKg: 0.22, filterRadiusCm: 1.5, bedThicknessCm: 0.8, headspaceMl: 3,   riserHeightCm: 4  },
  3:  { waterMl: 150, groundsG: 17, potMassKg: 0.35, filterRadiusCm: 2.2, bedThicknessCm: 1.2, headspaceMl: 5,   riserHeightCm: 6  },
  6:  { waterMl: 300, groundsG: 30, potMassKg: 0.50, filterRadiusCm: 2.8, bedThicknessCm: 1.5, headspaceMl: 10,  riserHeightCm: 8  },
  9:  { waterMl: 450, groundsG: 45, potMassKg: 0.65, filterRadiusCm: 3.2, bedThicknessCm: 1.8, headspaceMl: 15,  riserHeightCm: 10 },
  12: { waterMl: 600, groundsG: 55, potMassKg: 0.80, filterRadiusCm: 3.5, bedThicknessCm: 2.0, headspaceMl: 20,  riserHeightCm: 12 },
}

// Coffee bed permeability (m²) as function of grind size
// Calibrated against Navarini et al. (2009) and Gianino (2007):
//   - Moka grind (~400μm): permeability ~1-5 × 10⁻¹² m²
//   - Espresso grind (~200μm): ~1 × 10⁻¹³ m²
//   - The key is that for a PACKED bed (tamped into moka basket), permeability
//     is at the lower end. Coffee bed is ~60% solids by volume.
//   - Navarini noted permeability DECREASES during extraction as oils swell
function grindToPermeability(grindSize: number): number {
  // Packed coffee bed permeabilities (literature + calibrated):
  // The moka pot works because the tightly-packed coffee bed restricts flow,
  // allowing pressure to build to 1-2 bar before extraction accelerates.
  //
  // Gianino (2007) measured permeability of moka coffee beds:
  //   k ≈ 1-5 × 10⁻¹² m² for standard moka grind
  // But this is for a LOOSE bed. Packed/tamped reduces by 5-10×.
  //
  // Calibrated against simulation targets:
  //   Grind 3 at 800W gas/3-cup: onset ~80°C, peak ~1.2 bar, done ~5 min
  //   Each grind step changes permeability by ~3-5×
  //
  // With 5 mL headspace in a 3-cup pot:
  //   Theoretical max gauge pressure (no extraction): ~1.3 bar at 100°C
  //   Need permeability low enough that flow is slow at sub-1-bar driving
  //   but fast enough (~2 mL/s) at 1+ bar to complete in 2-3 minutes of brewing
  //
  // Grind 1 (espresso):    ~3e-14 → barely any flow at 1 bar
  // Grind 3 (moka ideal):  ~5e-13 → restricted enough to build 1+ bar
  // Grind 5 (medium):      ~1e-11 → flows easily, low pressure
  // Grind 10 (french press): ~1e-9 → unrestricted
  const logMin = -13.5   // grind 1: ~3e-14
  const logMax = -9.0    // grind 10: ~1e-9
  return Math.pow(10, logMin + (grindSize - 1) / 9 * (logMax - logMin))
}

// Antoine equation for water saturation vapor pressure (Pa)
// More accurate than Clausius-Clapeyron across the full temperature range
// Constants for water, valid 1-100°C (NIST)
function satVaporPressure(tempC: number): number {
  // Buck equation (1981) — accurate to 0.05% over 0-100°C
  // P_sat = 611.21 × exp((18.678 - T_C/234.5) × T_C / (257.14 + T_C))
  return 611.21 * Math.exp((18.678 - tempC / 234.5) * tempC / (257.14 + tempC))
}

export function boilingPoint(altitudeM: number): number {
  // At what temperature does saturation vapor pressure = local atmospheric pressure?
  const pAtm = P_ATM * Math.exp(-altitudeM / 8500)
  // Newton's method — 5 iterations is plenty for convergence
  let T = 100.0
  for (let i = 0; i < 5; i++) {
    const pSat = satVaporPressure(T)
    const pSat2 = satVaporPressure(T + 0.01)
    const dpdtNum = (pSat2 - pSat) / 0.01
    T -= (pSat - pAtm) / dpdtNum
  }
  return T
}

function heatLossCoeff(potSize: number, potMaterial: string): number {
  // W/°C — convective + radiative loss from pot surface to air
  // Larger pots have more surface area, stainless retains heat less efficiently
  const baseLoss = 0.8 + 0.25 * Math.sqrt(potSize / 3)
  const materialFactor = potMaterial === 'stainless' ? 1.3 : 1.0 // stainless = hotter surface
  return baseLoss * materialFactor
}

// Temperature-dependent water viscosity (Pa·s)
// Vogel equation fit to NIST data
function waterViscosity(tempC: number): number {
  // Simplified: 1.002e-3 at 20°C, 0.282e-3 at 100°C
  return 2.414e-5 * Math.pow(10, 247.8 / (tempC + 273.15 - 140))
}

// =====================
// Main Simulation
// =====================
export function simulate(params: MokaParams): SimulationPoint[] {
  const spec = POT_SPECS[params.potSize] || POT_SPECS[3]
  const waterMassKg = spec.waterMl / 1000
  const boilTemp = boilingPoint(params.altitude)
  const ambientTemp = 22 // °C

  // Heat delivery to the pot bottom
  const stoveHeatW = params.stovePower * STOVE_EFF[params.stoveType]

  // Heat transfer from pot wall to water
  // Aluminum conducts heat ~12× faster than stainless steel
  // This affects how quickly the bottom heat reaches the water
  const kFactor = K_THERMAL[params.potMaterial] / K_THERMAL['aluminum']
  // Stainless: slower heat transfer → more heat stays in pot body → less goes to water
  // Aluminum: nearly all conducted heat reaches water
  const waterHeatFraction = 0.55 + 0.45 * kFactor // aluminum: ~1.0, stainless: ~0.585

  // Effective thermal mass (water + fraction of pot body being heated)
  const potCp = params.potMaterial === 'aluminum' ? C_ALUMINUM : C_STEEL
  const effectiveThermalMass = waterMassKg * C_WATER + spec.potMassKg * potCp * 0.4

  // Darcy's law parameters
  const permeability = grindToPermeability(params.grindSize)
  const filterArea = Math.PI * Math.pow(spec.filterRadiusCm * 0.01, 2) // m²
  const bedThickness = spec.bedThicknessCm * 0.01 // m

  // Hydrostatic head (ρgh) — water must be lifted this height
  const riserHeight = spec.riserHeightCm * 0.01
  const hydrostaticPa = RHO_WATER * 9.81 * riserHeight

  // Local atmospheric pressure (decreases with altitude)
  const pAtmLocal = P_ATM * Math.exp(-params.altitude / 8500)

  // Heat loss coefficient
  const hLoss = heatLossCoeff(params.potSize, params.potMaterial)

  // Initial air mass in headspace (sealed chamber)
  // n_air = P_atm × V / (R × T)
  const T_initial_K = params.startingWaterTemp + 273.15
  const V_headspace_initial = spec.headspaceMl * 1e-6 // m³
  const n_air_mol = (pAtmLocal * V_headspace_initial) / (R_GAS * T_initial_K) // mol of air

  const dt = 0.25 // seconds
  const points: SimulationPoint[] = []

  let waterTemp = params.startingWaterTemp
  let extractedMl = 0
  const totalToExtract = spec.waterMl * 0.85 // not all water exits (some stays in boiler/grounds)
  let phase: 'heating' | 'brewing' | 'done' = 'heating'
  let doneTime: number | null = null
  let currentFlowRate = 0
  let totalSteamGenKg = 0 // cumulative steam generated

  for (let t = 0; t <= 720; t += dt) { // max 12 min
    // ===================================================================
    // PRESSURE MODEL
    // ===================================================================
    // The lower chamber is sealed. Total pressure is from:
    //   1. Trapped dry air (heated, expanding into growing headspace)
    //   2. Water vapor (partial pressure follows saturation curve)
    //
    // KEY INSIGHT (Navarini 2009): Extraction begins well BELOW boiling
    // (~60-70°C) because the trapped air expands enough to push water up.
    // Steam becomes dominant only near boiling.
    //
    // As water exits, headspace volume grows, which REDUCES air pressure
    // but the temperature increase MORE than compensates at first.
    // ===================================================================

    // Current headspace volume = initial air space + extracted water volume
    const headspaceMl = spec.headspaceMl + extractedMl
    const headspaceM3 = headspaceMl * 1e-6
    const T_K = waterTemp + 273.15

    // 1. DRY AIR partial pressure (ideal gas law)
    //    n_air is conserved (sealed). P_air = n_air × R × T / V_headspace
    const pAir = (n_air_mol * R_GAS * T_K) / headspaceM3

    // 2. WATER VAPOR partial pressure
    //    Two regimes:
    //    a) Below boiling: vapor pressure = saturation (equilibrium with liquid)
    //       The liquid surface evaporates until equilibrium. This is immediate
    //       on our timescale. At 80°C this contributes ~47 kPa.
    //    b) At/above boiling: steam is actively generated. The vapor pressure
    //       can EXCEED saturation because steam is produced faster than it
    //       condenses or escapes through the coffee bed. This is what creates
    //       the 1-2 bar pressure in a real moka pot.
    //       We track steam mass explicitly and compute pressure via ideal gas.
    //
    // Below boiling, use saturation. Above boiling, use tracked steam mass.
    const pSat = satVaporPressure(waterTemp)
    let pVapor: number
    if (waterTemp < boilTemp) {
      // Equilibrium vapor pressure (always present above liquid water)
      pVapor = pSat
    } else {
      // At boiling: use whichever is higher — saturation or tracked steam
      const steamMoles = totalSteamGenKg / M_WATER
      const pSteamIdealGas = steamMoles > 0
        ? (steamMoles * R_GAS * T_K) / headspaceM3
        : 0
      pVapor = Math.max(pSat, pSteamIdealGas)
    }

    // Total absolute pressure in lower chamber
    const chamberPa = pAir + pVapor

    // Safety valve at 3.5 bar gauge — vents steam to limit pressure
    let gaugePa = Math.max(0, chamberPa - pAtmLocal)
    if (gaugePa > 3.5e5) {
      gaugePa = 3.5e5
      // Vent excess steam to maintain safety valve pressure
      // Reduce tracked steam mass to match
      const targetTotal = pAtmLocal + 3.5e5
      const targetVapor = targetTotal - pAir
      if (targetVapor > 0 && targetVapor < pVapor) {
        const targetSteamMass = (targetVapor * headspaceM3 * M_WATER) / (R_GAS * T_K)
        totalSteamGenKg = Math.min(totalSteamGenKg, Math.max(0, targetSteamMass))
      }
    }
    const gaugePressureBar = gaugePa / 1e5

    // ===================================================================
    // FLOW MODEL (Darcy's Law through porous coffee bed)
    // ===================================================================
    // Flow starts when chamber pressure exceeds:
    //   - Atmospheric pressure on top (already accounted for in gauge)
    //   - Hydrostatic head (ρgh of water column in riser)
    //   - Seal friction / gasket resistance (~5 kPa)
    //
    // The coffee bed resistance is modeled by Darcy's law:
    //   Q = (k × A × ΔP) / (μ × L)
    // where k = permeability, A = filter area, μ = viscosity, L = bed thickness
    // ===================================================================

    // Flow threshold — the minimum gauge pressure to initiate flow.
    // In a real moka pot, water doesn't trickle through gradually.
    // The packed coffee bed strongly resists initial wetting (capillary entry
    // pressure), and this resistance is HIGHER for finer grinds.
    //
    // Once the bed is wetted, Darcy flow dominates and the capillary
    // resistance drops significantly. This creates the characteristic
    // "burst" onset of moka pot extraction.
    //
    // Components:
    //   - Hydrostatic head (ρgh): ~0.04-0.12 bar
    //   - Gasket seal: ~0.05 bar
    //   - Capillary entry: ~0.2-0.8 bar (grind-dependent)
    // The threshold for flow is just hydrostatic head + seal friction.
    // Coffee bed resistance is handled entirely by Darcy's law (permeability).
    // No separate capillary term — in reality, the fine grind IS the resistance.
    const sealFrictionPa = 5000     // ~0.05 bar — gasket seal
    const thresholdPa = hydrostaticPa + sealFrictionPa

    const drivingPa = Math.max(0, gaugePa - thresholdPa)
    let flowRateM3s = 0

    const viscosity = waterViscosity(waterTemp)

    if (drivingPa > 0 && extractedMl < totalToExtract) {
      // Darcy's law: Q = (k × A × ΔP) / (μ × L)
      flowRateM3s = (permeability * filterArea * drivingPa) / (viscosity * bedThickness)

      // Permeability reduction during extraction (Navarini 2009):
      // Coffee oils and fines swell the bed, reducing permeability by ~30-50%
      const extractionFraction = extractedMl / totalToExtract
      const bedSwellFactor = 1.0 - 0.35 * extractionFraction
      flowRateM3s *= bedSwellFactor

      // Physical flow cap: riser tube limits max flow (~8 mL/s)
      flowRateM3s = Math.min(flowRateM3s, 8e-6)
    }
    currentFlowRate = flowRateM3s * 1e6 // convert to mL/s

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
    if (currentFlowRate > 0.05 && phase === 'heating') {
      phase = 'brewing'
    }
    // (bed wetting handled implicitly by Darcy flow)

    // ===================================================================
    // HEAT TRANSFER
    // ===================================================================
    // Stove → pot wall → water
    // Heat loss: convection + radiation from pot surface to ambient air
    //
    // The Siregar model uses: dθ/dτ = 1 - Bi·θ
    // In dimensional form: dT/dt = Q_stove/(m·Cp) - h_loss·(T-T_amb)/(m·Cp)
    // ===================================================================

    const heatIn = stoveHeatW * waterHeatFraction * dt          // J delivered to water
    const heatLost = hLoss * Math.max(0, waterTemp - ambientTemp) * dt  // J lost to environment
    let netHeat = heatIn - heatLost

    if (waterTemp < boilTemp) {
      // Below boiling: heat raises temperature
      waterTemp += netHeat / effectiveThermalMass
      waterTemp = Math.max(waterTemp, params.startingWaterTemp)
    } else {
      // At/above boiling: excess energy produces steam (latent heat)
      // Some energy still raises temperature slightly in pressurized vessel
      const tempRiseEnergy = netHeat * 0.05
      waterTemp += tempRiseEnergy / effectiveThermalMass
      waterTemp = Math.min(waterTemp, boilTemp + 5) // limited superheating

      // Rest goes to steam production
      const steamEnergy = netHeat * 0.95
      if (steamEnergy > 0) {
        totalSteamGenKg += steamEnergy / L_VAP
      }

      // Steam condensation on cooler surfaces (upper chamber walls, funnel)
      // and steam consumed by flow through the coffee bed.
      // High condensation rate because the upper chamber is initially cool
      // and has large surface area relative to the small headspace.
      // This is what regulates moka pot pressure to 1-2 bar instead of
      // the 3.5+ bar that unchecked steam production would create.
      //
      // The condensation rate decreases as the upper chamber heats up
      // Steam losses:
      // 1. Condensation on cooler upper chamber walls and funnel
      //    Rate depends on how warm the upper chamber is (warms from hot flow)
      //    and on pot material (stainless has lower thermal conductivity →
      //    stays cooler → more condensation on walls, less on chamber)
      const upperChamberWarmth = Math.min(1, extractedMl / totalToExtract)
      const condensRate = (0.55 - 0.35 * upperChamberWarmth) * dt
      totalSteamGenKg = Math.max(0, totalSteamGenKg * (1 - condensRate))
      
      // 2. Steam carried away by flow through the coffee bed
      if (currentFlowRate > 0) {
        const steamInFlow = totalSteamGenKg * 0.05 * currentFlowRate * dt
        totalSteamGenKg = Math.max(0, totalSteamGenKg - steamInFlow)
      }
    }

    // ===================================================================
    // EXTRACTION UPDATE
    // ===================================================================
    // Flow removes hot water from the boiler
    // As water exits, headspace grows → air pressure drops
    // But temperature is still rising → net pressure continues to increase
    // This creates the self-regulating feedback described by Siregar (2026)
    // ===================================================================

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

// Match stove: calculate equivalent power for a different stove type
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

  // Extraction completeness
  const finalExtraction = points[points.length - 1]?.extractionPct || 0

  // === SCORING ===

  // Total brew time: ideal 4-6 min
  let timeScore: number
  if (brewTimeMin < 2) timeScore = 15
  else if (brewTimeMin < 4) timeScore = 15 + (brewTimeMin - 2) / 2 * 85
  else if (brewTimeMin <= 6) timeScore = 100
  else if (brewTimeMin <= 8) timeScore = 100 - (brewTimeMin - 6) / 2 * 50
  else timeScore = 20

  // Pressure: ideal 1-2 bar (moka pot sweet spot)
  let pressureScore: number
  if (peakPressure < 0.3) pressureScore = 20
  else if (peakPressure < 1) pressureScore = 20 + (peakPressure - 0.3) / 0.7 * 80
  else if (peakPressure <= 2) pressureScore = 100
  else if (peakPressure <= 3) pressureScore = 100 - (peakPressure - 2) * 40
  else pressureScore = 30

  // Temperature at extraction: ideal 85-96°C (Navarini found best flavor 88-94°C)
  let tempScore: number
  if (maxTemp < 70) tempScore = 30
  else if (maxTemp < 85) tempScore = 30 + (maxTemp - 70) / 15 * 70
  else if (maxTemp <= 96) tempScore = 100
  else if (maxTemp <= 102) tempScore = 100 - (maxTemp - 96) / 6 * 30
  else tempScore = 50

  // Flow: ideal 1-3 mL/s
  let flowScore = 100
  if (avgFlowRate < 0.3) flowScore = 20
  else if (avgFlowRate < 1.0) flowScore = 20 + (avgFlowRate - 0.3) / 0.7 * 80
  else if (avgFlowRate <= 3.0) flowScore = 100
  else if (avgFlowRate <= 5.0) flowScore = 100 - (avgFlowRate - 3.0) / 2.0 * 50
  else flowScore = 30

  // Extraction completeness bonus
  let extractionBonus = 0
  if (finalExtraction >= 85) extractionBonus = 5
  else if (finalExtraction < 50) extractionBonus = -10

  const score = Math.round(
    timeScore * 0.30 + pressureScore * 0.25 + tempScore * 0.25 + flowScore * 0.20 + extractionBonus
  )
  const clampedScore = Math.max(0, Math.min(100, score))

  // Label based on score, with physical-condition overrides for extreme cases
  let label: BrewQuality['label']
  let tip: string

  if (clampedScore >= 80) {
    label = 'Excellent'
    tip = 'Sweet spot! Rich, balanced coffee with bright acidity and nutty/caramel notes.'
    if (peakPressure > 2.5) tip += ' Tip: slightly lower heat could smooth out the flavor.'
    if (avgFlowRate < 0.8) tip += ' Tip: a slightly coarser grind would improve flow.'
  } else if (clampedScore >= 60) {
    label = 'Good'
    if (brewTimeMin < 2.5) {
      tip = 'Brew is a bit fast. Try lower heat or finer grind for more body.'
    } else if (brewTimeMin > 7) {
      tip = 'Taking a bit long. Try slightly higher heat or coarser grind.'
    } else if (peakPressure > 2.5) {
      tip = 'Pressure is high — a coarser grind or lower heat would help.'
    } else if (avgFlowRate < 0.8) {
      tip = 'Flow is slow — try a slightly coarser grind.'
    } else if (avgFlowRate > 3.5) {
      tip = 'Flow is fast — a finer grind would slow it down and add body.'
    } else {
      tip = 'Close to perfect — fine-tune grind or heat by one step.'
    }
  } else if (clampedScore >= 40) {
    if (maxTemp > boilTemp + 3 && peakPressure > 2.5) {
      label = 'Bitter'
      tip = 'Too hot & too much pressure. Reduce heat significantly. Try pre-heating water to 80°C.'
    } else if (peakPressure > 3.0) {
      label = 'Bitter'
      tip = 'Pressure way too high — use a coarser grind or lower heat.'
    } else if (brewTimeMin < 2) {
      label = 'Under-extracted'
      tip = 'Too fast — use a finer grind or lower heat for more contact time.'
    } else if (brewTimeMin > 8) {
      label = 'Over-extracted'
      tip = 'Way too slow — coarser grind or higher heat. Try pre-heating water.'
    } else {
      label = 'Under-extracted'
      tip = 'Use a finer grind (3-4 for moka, like fine salt) and ensure a tight seal.'
    }
  } else {
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

  // Estimate steam energy from final temperature
  const boilTemp = boilingPoint(params.altitude)
  const steamFraction = peakTemp > boilTemp ? 0.10 : 0.02 // rough estimate
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
