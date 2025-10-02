"use client"

import { useState } from "react"
import { Smartphone, Phone, Trash2 } from "lucide-react"
import { PhoneType, SessionData } from "../types"

interface PhoneSelectorProps {
  phoneType: PhoneType
  onPhoneTypeChange: (type: PhoneType) => void
  savedNumbers: string[]
  onSelectNumber: (phoneNumber: string) => void
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
  onRemoveNumber,
  currentNumber,
  onExecuteCode,
}: PhoneSelectorProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showNumberInput, setShowNumberInput] = useState(false)

  const handleAddNumber = () => {
    if (phoneNumber.trim()) {
      onSelectNumber(phoneNumber)
      setShowNumberInput(false)
      setPhoneNumber("")
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
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Saved Numbers:</p>
            <div className="space-y-1">
              {savedNumbers.map(number => (
                <div key={number} className="flex items-center gap-2">
                  <button
                    onClick={() => selectSavedNumber(number)}
                    className={`flex-1 text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      number === currentNumber
                        ? "bg-blue-100 border-2 border-blue-300 text-blue-800"
                        : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                    }`}>
                    {number} {number === currentNumber && "✓"}
                  </button>
                  <button
                    onClick={() => onRemoveNumber(number)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete number">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showNumberInput ? (
          <button
            onClick={() => setShowNumberInput(true)}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            + Add New Number
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="e.g., +254712345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddNumber}
                disabled={!phoneNumber.trim()}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                Add Number
              </button>
              <button
                onClick={() => setShowNumberInput(false)}
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
