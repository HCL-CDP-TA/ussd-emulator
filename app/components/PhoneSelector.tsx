"use client"

import { useState } from "react"
import { Smartphone, Phone, Trash2 } from "lucide-react"
import { PhoneType, SessionData } from "../types"

interface PhoneSelectorProps {
  phoneType: PhoneType
  onPhoneTypeChange: (type: PhoneType) => void
  savedNumbers: string[]
  onSelectNumber: (phoneNumber: string) => void
  onAddNumber: (phoneNumber: string, label?: string) => Promise<boolean>
  onRemoveNumber: (phoneNumber: string) => void
  currentNumber: string
  sessionData: SessionData
  onExecuteCode: (code: string) => void
}

const commonUssdCodes = [
  { code: "*144#", description: "Check Balance" },
  { code: "*444#", description: "Data Bundles" },
  { code: "*555#", description: "Voice Bundles" },
  { code: "*100#", description: "My Account" },
  { code: "*234#", description: "Special Offers" },
]

export default function PhoneSelector({
  phoneType,
  onPhoneTypeChange,
  savedNumbers,
  onSelectNumber,
  onAddNumber,
  onRemoveNumber,
  currentNumber,
  onExecuteCode,
}: PhoneSelectorProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showNumberInput, setShowNumberInput] = useState(false)
  const [addError, setAddError] = useState("")

  // Validate phone number format (E.164 international format)
  const isValidPhoneNumber = (phone: string): boolean => {
    // E.164 format: + followed by 7-15 digits total
    return /^\+\d{7,15}$/.test(phone)
  }

  const handleAddNumber = async () => {
    const trimmedNumber = phoneNumber.trim()
    setAddError("")

    if (!trimmedNumber) {
      setAddError("Phone number is required")
      return
    }

    if (!isValidPhoneNumber(trimmedNumber)) {
      setAddError("Invalid phone number format. Use +XXXXXXXXXXXX (7-15 digits)")
      return
    }

    if (savedNumbers.includes(trimmedNumber)) {
      setAddError("Phone number already exists")
      return
    }

    const success = await onAddNumber(trimmedNumber)
    if (success) {
      onSelectNumber(trimmedNumber)
      setShowNumberInput(false)
      setPhoneNumber("")
      setAddError("")
    } else {
      setAddError("Failed to add phone number")
    }
  }

  const selectSavedNumber = (number: string) => {
    onSelectNumber(number)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Controls</h2>

      {/* Phone Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
        <div className="flex w-full">
          <button
            onClick={() => onPhoneTypeChange("smartphone")}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-l-md text-sm font-medium transition-colors ${
              phoneType === "smartphone" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}>
            <Smartphone className="w-4 h-4 mr-2" />
            Smartphone
          </button>
          <button
            onClick={() => onPhoneTypeChange("featurephone")}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-r-md text-sm font-medium transition-colors ${
              phoneType === "featurephone" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}>
            <Phone className="w-4 h-4 mr-2" />
            Feature Phone
          </button>
        </div>
      </div>

      {/* Phone Number Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>

        {savedNumbers.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Saved Numbers ({savedNumbers.length}):</p>
            <div className="max-h-48 overflow-y-auto border rounded-md bg-gray-50">
              <div className="space-y-1 p-2">
                {savedNumbers.map(number => (
                  <div
                    key={number}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      currentNumber === number ? "bg-blue-100 border border-blue-300" : "bg-white hover:bg-gray-100"
                    }`}
                    onClick={() => selectSavedNumber(number)}>
                    <span className="text-sm font-mono">{number}</span>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onRemoveNumber(number)
                      }}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                      title="Remove number">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!showNumberInput ? (
          <button
            onClick={() => {
              setShowNumberInput(true)
              setAddError("")
            }}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            + Add New Number
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => {
                setPhoneNumber(e.target.value)
                setAddError("") // Clear error on input change
              }}
              placeholder="e.g., +254712345678"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                addError ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              autoFocus
              onKeyPress={e => {
                if (e.key === "Enter") {
                  handleAddNumber()
                }
              }}
            />
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <div className="flex space-x-2">
              <button
                onClick={handleAddNumber}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                Add Number
              </button>
              <button
                onClick={() => {
                  setShowNumberInput(false)
                  setPhoneNumber("")
                  setAddError("")
                }}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Common USSD Codes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick USSD Codes</label>
        <div className="space-y-2">
          {commonUssdCodes.map(ussd => (
            <div key={ussd.code} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div className="flex-1">
                <code className="text-sm font-mono text-green-600">{ussd.code}</code>
                <p className="text-xs text-gray-500">{ussd.description}</p>
              </div>
              <button
                onClick={() => onExecuteCode(ussd.code)}
                disabled={!currentNumber}
                className="ml-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300 transition-colors">
                Execute
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
