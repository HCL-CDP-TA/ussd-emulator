import { NextRequest, NextResponse } from "next/server"
import { USSDRequest, USSDResponse, CustomerProfile, Offer, PhoneNumbersData } from "../../types"
import { ApiConfiguration, ApiClient, ApiRequest, ApiResponse } from "@hcl-cdp-ta/cdp-node-sdk"
import { promises as fs } from "fs"
import path from "path"

// Path to the phone numbers JSON file
const PHONE_NUMBERS_FILE = path.join(process.cwd(), "data", "phone-numbers.json")

// Get IMEI for a phone number from centralized store
async function getIMEIForPhoneNumber(phoneNumber: string): Promise<string | null> {
  try {
    const data = await fs.readFile(PHONE_NUMBERS_FILE, "utf-8")
    const phoneData: PhoneNumbersData = JSON.parse(data)
    const phoneEntry = phoneData.phoneNumbers.find(p => p.phoneNumber === phoneNumber)
    return phoneEntry?.imei || null
  } catch (error) {
    console.error("Error reading phone numbers:", error)
    return null
  }
}

// Mock customer database
const mockCustomers: Record<string, CustomerProfile> = {
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
}

// Default customer for unknown numbers
const defaultCustomer: CustomerProfile = {
  phoneNumber: "",
  accountBalance: 89.75,
  dataUsage: 5.0,
  voiceUsage: 75,
  preferredOffers: ["data", "voice"],
  lastTopUp: "2024-09-26",
  segment: "regular",
}

// Personalized offers based on customer segment and preferences
const getPersonalizedOffers = (customer: CustomerProfile): Offer[] => {
  const baseOffers: Offer[] = [
    {
      id: "data_1gb",
      title: "1GB Data Bundle",
      description: "1GB valid for 7 days",
      price: 99,
      dataAmount: "1GB",
      validity: "7 days",
    },
    {
      id: "data_3gb",
      title: "3GB Data Bundle",
      description: "3GB valid for 30 days",
      price: 249,
      dataAmount: "3GB",
      validity: "30 days",
    },
    {
      id: "voice_100min",
      title: "100 Minutes Bundle",
      description: "100 minutes to all networks",
      price: 150,
      voiceMinutes: "100",
      validity: "7 days",
    },
    {
      id: "combo_deal",
      title: "Combo Deal",
      description: "2GB + 50 minutes",
      price: 199,
      dataAmount: "2GB",
      voiceMinutes: "50",
      validity: "14 days",
    },
  ]

  // Personalize based on segment and preferences
  const personalizedOffers = baseOffers.map(offer => {
    const personalized = { ...offer }

    // Premium customers get discounts
    if (customer.segment === "premium") {
      personalized.price = Math.floor(offer.price * 0.9)
      if (offer.id === "combo_deal") {
        personalized.recommended = true
        personalized.title += " (Premium 10% Off!)"
      }
    }

    // Low-usage customers get smaller bundles prioritized
    if (customer.segment === "low-usage" && offer.id === "data_1gb") {
      personalized.recommended = true
      personalized.price = Math.floor(offer.price * 0.85)
      personalized.title += " (Special Discount!)"
    }

    // High data users get larger bundles recommended
    if (customer.dataUsage > 10 && offer.id === "data_3gb") {
      personalized.recommended = true
      personalized.title += " (Recommended for You!)"
    }

    return personalized
  })

  // Sort to put recommended offers first
  return personalizedOffers.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1
    if (!a.recommended && b.recommended) return 1
    return 0
  })
}

const processUSSDRequest = (request: USSDRequest): USSDResponse => {
  const customer = mockCustomers[request.phoneNumber] || {
    ...defaultCustomer,
    phoneNumber: request.phoneNumber,
  }

  console.log("USSD Request:", {
    ussdCode: request.ussdCode,
    input: request.input,
    menuPath: request.menuPath,
    menuPathLength: request.menuPath?.length,
  })

  // Main USSD menu routing
  switch (request.ussdCode) {
    case "*144#":
      return {
        message: `Your account balance is KSh ${customer.accountBalance.toFixed(2)}\n\nData balance: ${(
          10 - customer.dataUsage
        ).toFixed(1)}GB remaining\nVoice balance: ${
          300 - customer.voiceUsage
        } minutes remaining\n\nThank you for choosing Unitel.`,
        continueSession: false,
        sessionId: request.sessionId,
      }

    case "*444#":
      // If there's input, user is navigating through the data bundles menu
      if (request.input && request.menuPath && request.menuPath.length > 0) {
        const dataOffers = getPersonalizedOffers(customer).filter(
          offer => offer.dataAmount || offer.id === "combo_deal",
        )

        if (request.menuPath.length === 1) {
          // First level: User selected a data bundle, show confirmation
          const selection = parseInt(request.input)
          const selectedOffer = dataOffers[selection - 1]

          if (selectedOffer) {
            return {
              message: `PURCHASE CONFIRMATION\n\n${selectedOffer.title}\nPrice: KSh ${selectedOffer.price}\n${selectedOffer.description}\nValid for: ${selectedOffer.validity}\n\n1. Confirm Purchase\n2. Cancel`,
              continueSession: true,
              sessionId: request.sessionId,
              menuOptions: ["Confirm Purchase", "Cancel"],
            }
          }
        } else if (request.menuPath.length >= 2) {
          // Second level: User responded to confirmation
          const bundleSelection = parseInt(request.menuPath[0])
          const confirmationChoice = parseInt(request.input)
          const selectedOffer = dataOffers[bundleSelection - 1]

          console.log(
            `Confirmation logic: bundleSelection=${bundleSelection}, confirmationChoice=${confirmationChoice}, selectedOffer=${selectedOffer?.title}`,
          )

          if (confirmationChoice === 1) {
            // User confirmed purchase
            console.log("User confirmed purchase - ending session")
            return {
              message: `PURCHASE SUCCESSFUL!\n\n${selectedOffer.title} has been activated.\nPrice: KSh ${selectedOffer.price}\nValid for: ${selectedOffer.validity}\n\nThank you for using Unitel services!`,
              continueSession: false,
              sessionId: request.sessionId,
            }
          } else {
            // User cancelled
            console.log("User cancelled purchase - ending session")
            return {
              message: `Purchase cancelled.\n\nThank you for using Unitel services!`,
              continueSession: false,
              sessionId: request.sessionId,
            }
          }
        }
      }

      // Initial *444# call - show data bundles menu
      const dataOffers = getPersonalizedOffers(customer).filter(offer => offer.dataAmount || offer.id === "combo_deal")
      const menuText = dataOffers
        .map(
          (offer, index) =>
            `${index + 1}. ${offer.title} - KSh ${offer.price}${offer.recommended ? " (RECOMMENDED)" : ""}`,
        )
        .join("\n")

      return {
        message: `DATA BUNDLES\nChoose your data bundle:\n\n${menuText}`,
        continueSession: true,
        sessionId: request.sessionId,
        menuOptions: dataOffers.map(
          offer => `${offer.title} - KSh ${offer.price}${offer.recommended ? " (RECOMMENDED)" : ""}`,
        ),
        offers: dataOffers,
      }

    case "*555#":
      const voiceOffers = getPersonalizedOffers(customer).filter(
        offer => offer.voiceMinutes || offer.id === "combo_deal",
      )
      const voiceMenuText = voiceOffers
        .map(
          (offer, index) =>
            `${index + 1}. ${offer.title} - KSh ${offer.price}${offer.recommended ? " (RECOMMENDED)" : ""}`,
        )
        .join("\n")

      return {
        message: `VOICE BUNDLES\nChoose your voice bundle:\n\n${voiceMenuText}`,
        continueSession: true,
        sessionId: request.sessionId,
        menuOptions: voiceOffers.map(
          offer => `${offer.title} - KSh ${offer.price}${offer.recommended ? " (RECOMMENDED)" : ""}`,
        ),
        offers: voiceOffers,
      }

    case "*234#":
      const specialOffers = getPersonalizedOffers(customer)
      const specialMenuText = specialOffers
        .map(
          (offer, index) =>
            `${index + 1}. ${offer.title} - KSh ${offer.price}${offer.recommended ? " (RECOMMENDED)" : ""}`,
        )
        .join("\n")

      return {
        message: `SPECIAL OFFERS FOR YOU\n\nHi ${customer.segment.toUpperCase()} customer!\nPersonalized offers based on your usage:\n\n${specialMenuText}`,
        continueSession: true,
        sessionId: request.sessionId,
        menuOptions: specialOffers.map(
          offer => `${offer.title} - KSh ${offer.price}${offer.recommended ? " (RECOMMENDED)" : ""}`,
        ),
        offers: specialOffers,
      }

    case "*100#":
      return {
        message: `MY ACCOUNT\n\nPhone: ${customer.phoneNumber}\nBalance: KSh ${customer.accountBalance.toFixed(
          2,
        )}\nData Used: ${customer.dataUsage}GB this month\nVoice Used: ${customer.voiceUsage} minutes\nLast Top-up: ${
          customer.lastTopUp
        }\nCustomer Type: ${customer.segment.toUpperCase()}\n\n1. View Statements\n2. Change PIN\n3. Update Profile`,
        continueSession: true,
        sessionId: request.sessionId,
        menuOptions: ["View Statements", "Change PIN", "Update Profile"],
      }

    default:
      // Handle menu navigation based on input
      if (request.input && request.menuPath) {
        const selection = parseInt(request.input)

        // If we're in an offers menu, handle the selection
        if (request.menuPath.length > 0) {
          const offers = getPersonalizedOffers(customer)
          const selectedOffer = offers[selection - 1]

          if (selectedOffer) {
            return {
              message: `PURCHASE CONFIRMATION\n\n${selectedOffer.title}\nPrice: KSh ${selectedOffer.price}\n${selectedOffer.description}\nValid for: ${selectedOffer.validity}\n\nReply:\n1. Confirm Purchase\n2. Cancel`,
              continueSession: true,
              sessionId: request.sessionId,
              menuOptions: ["Confirm Purchase", "Cancel"],
            }
          }
        }

        // Handle confirmation
        if (request.input === "1" && request.menuPath.includes("1")) {
          return {
            message: `PURCHASE SUCCESSFUL!\n\nYour bundle has been activated.\nYou will receive an SMS confirmation shortly.\n\nNew Balance: KSh ${(
              customer.accountBalance - 199
            ).toFixed(2)}\n\nThank you for choosing Unitel!`,
            continueSession: false,
            sessionId: request.sessionId,
          }
        }
      }

      return {
        message: `Welcome to Unitel USSD Services\n\nInvalid code: ${request.ussdCode}\n\nTry:\n*144# - Check Balance\n*444# - Data Bundles\n*555# - Voice Bundles\n*234# - Special Offers\n*100# - My Account`,
        continueSession: false,
        sessionId: request.sessionId,
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: USSDRequest = await request.json()

    // Validate required fields
    if (!body.phoneNumber || !body.sessionId || !body.ussdCode || !body.imei) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const response = processUSSDRequest(body)

    return NextResponse.json(response)
  } catch (error) {
    console.error("USSD API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
