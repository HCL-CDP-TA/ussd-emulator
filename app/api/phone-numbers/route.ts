import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { generateIMEI } from "../utils/imei"
import { PhoneNumbersData, PhoneNumberEntry } from "../../types"

// Path to the phone numbers JSON file
const PHONE_NUMBERS_FILE = path.join(process.cwd(), "data", "phone-numbers.json")

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(PHONE_NUMBERS_FILE)
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// Initialize phone numbers file if it doesn't exist
async function initializePhoneNumbersFile() {
  try {
    await fs.access(PHONE_NUMBERS_FILE)
  } catch {
    const initialData = {
      phoneNumbers: [
        {
          phoneNumber: "+254712345678",
          imei: generateIMEI(),
          label: "Premium Customer",
          addedAt: new Date().toISOString(),
        },
        {
          phoneNumber: "+254723456789",
          imei: generateIMEI(),
          label: "Regular Customer",
          addedAt: new Date().toISOString(),
        },
        {
          phoneNumber: "+254734567890",
          imei: generateIMEI(),
          label: "Low-usage Customer",
          addedAt: new Date().toISOString(),
        },
      ],
    }
    await fs.writeFile(PHONE_NUMBERS_FILE, JSON.stringify(initialData, null, 2))
  }
}

// Read phone numbers from file
async function readPhoneNumbers(): Promise<PhoneNumbersData> {
  await ensureDataDirectory()
  await initializePhoneNumbersFile()

  const data = await fs.readFile(PHONE_NUMBERS_FILE, "utf-8")
  return JSON.parse(data)
}

// Write phone numbers to file
async function writePhoneNumbers(data: PhoneNumbersData) {
  await ensureDataDirectory()
  await fs.writeFile(PHONE_NUMBERS_FILE, JSON.stringify(data, null, 2))
}

// Validate phone number format
function isValidPhoneNumber(phoneNumber: string): boolean {
  // Basic E.164 format validation for Kenyan numbers
  return /^\+254[17]\d{8}$/.test(phoneNumber)
}

// GET - List all phone numbers
export async function GET() {
  try {
    const data = await readPhoneNumbers()
    return NextResponse.json({
      success: true,
      phoneNumbers: data.phoneNumbers,
    })
  } catch (error) {
    console.error("Error reading phone numbers:", error)
    return NextResponse.json({ success: false, error: "Failed to read phone numbers" }, { status: 500 })
  }
}

// POST - Add a new phone number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, label } = body

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 })
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format. Use +254XXXXXXXXX" },
        { status: 400 },
      )
    }

    const data = await readPhoneNumbers()

    // Check if phone number already exists
    const existingPhone = data.phoneNumbers.find((p: PhoneNumberEntry) => p.phoneNumber === phoneNumber)
    if (existingPhone) {
      return NextResponse.json({ success: false, error: "Phone number already exists" }, { status: 409 })
    }

    // Generate new phone number entry
    const newPhoneNumber = {
      phoneNumber,
      imei: generateIMEI(),
      label: label || `Phone ${phoneNumber}`,
      addedAt: new Date().toISOString(),
    }

    data.phoneNumbers.push(newPhoneNumber)
    await writePhoneNumbers(data)

    return NextResponse.json({
      success: true,
      phoneNumber: newPhoneNumber,
      message: "Phone number added successfully",
    })
  } catch (error) {
    console.error("Error adding phone number:", error)
    return NextResponse.json({ success: false, error: "Failed to add phone number" }, { status: 500 })
  }
}

// DELETE - Remove a phone number
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phoneNumber = url.searchParams.get("phoneNumber")

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: "Phone number parameter is required" }, { status: 400 })
    }

    const data = await readPhoneNumbers()
    const initialCount = data.phoneNumbers.length

    // Filter out the phone number to delete
    data.phoneNumbers = data.phoneNumbers.filter((p: PhoneNumberEntry) => p.phoneNumber !== phoneNumber)

    if (data.phoneNumbers.length === initialCount) {
      return NextResponse.json({ success: false, error: "Phone number not found" }, { status: 404 })
    }

    await writePhoneNumbers(data)

    return NextResponse.json({
      success: true,
      message: "Phone number removed successfully",
    })
  } catch (error) {
    console.error("Error removing phone number:", error)
    return NextResponse.json({ success: false, error: "Failed to remove phone number" }, { status: 500 })
  }
}
