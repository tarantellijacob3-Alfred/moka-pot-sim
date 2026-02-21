import { useState } from 'react'
import { boilingPoint } from '../physics'

interface Props {
  altitude: number
}

interface Section {
  title: string
  emoji: string
  content: string
  equation?: string
}

export default function EducationPanel({ altitude }: Props) {
  const [openSection, setOpenSection] = useState<number | null>(null)

  const bp = boilingPoint(altitude)

  const sections: Section[] = [
    {
      title: 'How a Moka Pot Works',
      emoji: '☕',
      content: `A moka pot has three chambers: the lower boiler (water), the middle filter basket (coffee grounds), and the upper collector. As the water heats, steam pressure in the lower chamber pushes hot water up through the grounds and into the upper chamber. It's not true espresso pressure (9 bar), but rather 1-2 bar — enough to make a strong, concentrated coffee.`,
    },
    {
      title: 'Heat Transfer & Q=mcΔT',
      emoji: '🔥',
      content: `The fundamental equation governing heating is Q = mcΔT, where Q is energy (Joules), m is mass (kg), c is specific heat capacity (4,186 J/kg·°C for water), and ΔT is the temperature change. Your stove supplies Q over time (power in watts = J/s). A higher-wattage setting heats the water faster, but different stove types have different efficiencies — gas loses ~60% to the surrounding air, while induction transfers ~85% directly to the pot.`,
      equation: 'Q = mcΔT → ΔT = P·t / (m·c)',
    },
    {
      title: 'Thermal Conductivity of Materials',
      emoji: '🪶',
      content: `Aluminum conducts heat 12× better than stainless steel (205 vs 16 W/m·K). This means aluminum pots heat more evenly and respond faster to temperature changes. Stainless steel pots are more durable and don't react with acidic coffee, but they heat slower and can create hot spots. This is why traditional Italian moka pots (like Bialetti) are always aluminum.`,
    },
    {
      title: 'Phase Change & Steam Pressure',
      emoji: '💨',
      content: `As water approaches its boiling point (${bp.toFixed(1)}°C at your altitude of ${altitude}m), molecules gain enough energy to escape as vapor. This phase change requires the latent heat of vaporization: 2,260 kJ/kg — enormous energy just to change state without increasing temperature. The resulting steam occupies ~1,700× the volume of the liquid water, creating the pressure that drives brewing. The ideal gas law (PV = nRT) governs this pressure buildup.`,
      equation: 'PV = nRT, L_v = 2,260 kJ/kg',
    },
    {
      title: 'Boiling Point & Altitude',
      emoji: '🏔️',
      content: `At sea level, water boils at 100°C under 1 atm of pressure. At higher altitudes, atmospheric pressure drops (~12% per 1,000m), so water boils at a lower temperature. At your altitude of ${altitude}m, water boils at ${bp.toFixed(1)}°C. This is described by the Clausius-Clapeyron equation. Lower boiling point means less pressure buildup and a longer brew time at high altitudes — and potentially under-extracted coffee.`,
      equation: 'dP/dT = L / (T·ΔV)',
    },
    {
      title: "Darcy's Law & Grind Size",
      emoji: '⬡',
      content: `The flow of water through coffee grounds follows Darcy's Law: Q = (kAΔP) / (μL), where k is permeability (determined by grind size), A is cross-sectional area, ΔP is the pressure difference, μ is water viscosity, and L is the thickness of the coffee bed. Finer grinds have lower permeability, meaning more resistance to flow, higher pressure, and slower extraction. This gives you more contact time and stronger flavor — but too fine and you'll choke the flow entirely.`,
      equation: 'Q = (k·A·ΔP) / (μ·L)',
    },
    {
      title: 'Stove Efficiency',
      emoji: '⚡',
      content: `Not all the energy your stove produces reaches the water. Gas stoves lose about 60% — heat escapes around the pot, heats the air, and radiates away. Electric coils are better at ~70%, but still lose heat through the air gap and imperfect contact. Induction is the most efficient at ~85% — it generates heat directly in the pot's metal through electromagnetic induction, with almost no wasted energy. This is why the same "medium" setting produces very different results across stove types.`,
    },
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-coffee-200 flex items-center gap-2">
        📚 The Science
      </h2>

      {sections.map((section, i) => {
        const isOpen = openSection === i
        return (
          <div
            key={i}
            className="glass-panel rounded-xl overflow-hidden"
            style={{
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              borderColor: isOpen ? 'rgba(212,165,100,0.25)' : undefined,
            }}
          >
            {/* Header button */}
            <button
              onClick={() => setOpenSection(isOpen ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left"
              style={{ background: isOpen ? 'rgba(61,40,16,0.25)' : 'transparent', transition: 'background 0.25s ease' }}
            >
              <span className="font-medium text-coffee-200 text-sm flex items-center gap-2.5">
                <span
                  className="text-lg flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{
                    background: isOpen ? 'rgba(160,107,42,0.2)' : 'rgba(61,40,16,0.4)',
                    transition: 'background 0.25s ease',
                  }}
                >
                  {section.emoji}
                </span>
                {section.title}
              </span>
              <span
                className="text-coffee-500 ml-2 flex-shrink-0"
                style={{
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                ▾
              </span>
            </button>

            {/* Body with smooth max-height transition */}
            <div className={`accordion-body${isOpen ? ' open' : ''}`}>
              <div className="px-4 pb-5 space-y-3">
                <p className="text-sm text-coffee-300 leading-relaxed">
                  {section.content}
                </p>
                {section.equation && (
                  <div className="equation-box">
                    <code className="text-coffee-200 text-sm font-mono font-semibold tracking-wide">
                      {section.equation}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
