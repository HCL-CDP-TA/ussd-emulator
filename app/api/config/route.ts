import { NextRequest, NextResponse } from "next/server"
import { CustomerProfile } from "../../types"

// Configuration for the demo
interface DemoConfig {
  customers: Record<string, CustomerProfile>
  offerMultipliers: {
    premium: number
    regular: number
    lowUsage: number
  }
  specialPromotions: {
    enabled: boolean
    discountPercent: number
    targetSegment: string
  }
}

let demoConfig: DemoConfig = {
  customers: {
    "+254712345678": {
      phoneNumber: "+254712345678",
      accountBalance: 250.5,
      dataUsage: 2.5,
      voiceUsage: 45,
      preferredOffers: ["data", "voice"],
      lastTopUp: "2024-09-28",
      segment: "premium",
    },
    "+254723456789": {
      phoneNumber: "+254723456789",
      accountBalance: 45.2,
      dataUsage: 8.2,
      voiceUsage: 120,
      preferredOffers: ["data"],
      lastTopUp: "2024-09-25",
      segment: "regular",
    },
    "+254734567890": {
      phoneNumber: "+254734567890",
      accountBalance: 12.8,
      dataUsage: 15.5,
      voiceUsage: 200,
      preferredOffers: ["voice", "airtime"],
      lastTopUp: "2024-09-20",
      segment: "low-usage",
    },
  },
  offerMultipliers: {
    premium: 0.9,
    regular: 1.0,
    lowUsage: 0.85,
  },
  specialPromotions: {
    enabled: true,
    discountPercent: 15,
    targetSegment: "premium",
  },
}

export async function GET() {
  return NextResponse.json(demoConfig)
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json()

    // Update configuration
    if (updates.customers) {
      demoConfig.customers = { ...demoConfig.customers, ...updates.customers }
    }

    if (updates.offerMultipliers) {
      demoConfig.offerMultipliers = { ...demoConfig.offerMultipliers, ...updates.offerMultipliers }
    }

    if (updates.specialPromotions) {
      demoConfig.specialPromotions = { ...demoConfig.specialPromotions, ...updates.specialPromotions }
    }

    return NextResponse.json({ success: true, config: demoConfig })
  } catch {
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const newConfig = await request.json()
    demoConfig = { ...demoConfig, ...newConfig }

    return NextResponse.json({ success: true, config: demoConfig })
  } catch {
    return NextResponse.json({ error: "Failed to replace configuration" }, { status: 500 })
  }
}
