"use client"

import { useState, useEffect, useCallback } from "react"
import PhoneSelector from "./components/PhoneSelector"
import SmartPhone from "./components/SmartPhone"
import FeaturePhone from "./components/FeaturePhone"
import { PhoneType, SessionData, USSDRequest, USSDResponse, PhoneNumberEntry } from "./types"

export default function Home() {
  const [phoneType, setPhoneType] = useState<PhoneType>("smartphone")
  const [currentNumber, setCurrentNumber] = useState<string>("")
  const [sessionData, setSessionData] = useState<SessionData>({
    phoneNumber: "",
    sessionId: "",
    currentMenu: "",
    menuStack: [],
  })

  const [savedPhones, setSavedPhones] = useState<PhoneNumberEntry[]>([])
  const [debugData, setDebugData] = useState<{
    lastRequest?: USSDRequest
    lastResponse?: USSDResponse
    timestamp?: string
  }>({})
  const [showDebug, setShowDebug] = useState(false)

  const loadPhoneNumbers = useCallback(async () => {
    try {
      const response = await fetch("/api/phone-numbers")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSavedPhones(data.phoneNumbers)
          // Set first phone as default if none selected
          if (!currentNumber && data.phoneNumbers.length > 0) {
            setCurrentNumber(data.phoneNumbers[0].phoneNumber)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load phone numbers:", error)
    }
  }, [currentNumber])

  useEffect(() => {
    // Load phone numbers from centralized API
    loadPhoneNumbers()
  }, [loadPhoneNumbers])

  const savePhoneNumber = async (phoneNumber: string, label?: string) => {
    try {
      const response = await fetch("/api/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, label }),
      })

      if (response.ok) {
        await loadPhoneNumbers() // Reload the list
        return true
      } else {
        const error = await response.json()
        console.error("Failed to add phone number:", error.error)
        return false
      }
    } catch (error) {
      console.error("Failed to add phone number:", error)
      return false
    }
  }

  const selectNumber = (phoneNumber: string) => {
    setCurrentNumber(phoneNumber)
    setSessionData({
      sessionId: "",
      phoneNumber: "",
      currentMenu: "",
      menuStack: [],
    })
  }

  const removeNumber = async (phoneNumber: string) => {
    try {
      const response = await fetch(`/api/phone-numbers?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadPhoneNumbers() // Reload the list
        // If removed number was current, switch to first available
        if (currentNumber === phoneNumber && savedPhones.length > 1) {
          const remaining = savedPhones.filter(p => p.phoneNumber !== phoneNumber)
          if (remaining.length > 0) {
            setCurrentNumber(remaining[0].phoneNumber)
          } else {
            setCurrentNumber("")
          }
        }
      }
    } catch (error) {
      console.error("Failed to remove phone number:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">USSD Emulator</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PhoneSelector
              phoneType={phoneType}
              onPhoneTypeChange={setPhoneType}
              savedNumbers={savedPhones.map(phone => phone.phoneNumber)}
              onSelectNumber={selectNumber}
              onAddNumber={savePhoneNumber}
              onRemoveNumber={removeNumber}
              currentNumber={currentNumber}
              sessionData={sessionData}
              onExecuteCode={code => {
                // Execute code on the active phone
                if (phoneType === "smartphone") {
                  window.dispatchEvent(new CustomEvent("executeUSSD", { detail: code }))
                } else {
                  window.dispatchEvent(new CustomEvent("executeUSSD", { detail: code }))
                }
              }}
            />

            {/* Debug Toggle */}
            <div className="mt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                {showDebug ? "Hide" : "Show"} Debug Info
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-center">
            {phoneType === "smartphone" ? (
              <SmartPhone
                currentNumber={currentNumber}
                phoneIMEIMap={Object.fromEntries(savedPhones.map(phone => [phone.phoneNumber, phone.imei]))}
                sessionData={sessionData}
                onSessionUpdate={setSessionData}
                onDebugUpdate={setDebugData}
              />
            ) : (
              <FeaturePhone
                currentNumber={currentNumber}
                phoneIMEIMap={Object.fromEntries(savedPhones.map(phone => [phone.phoneNumber, phone.imei]))}
                sessionData={sessionData}
                onSessionUpdate={setSessionData}
                onDebugUpdate={setDebugData}
              />
            )}
          </div>
        </div>

        {/* Debug Screen */}
        {showDebug && (
          <div className="mt-8">
            <div className="bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm">
              <h3 className="text-xl font-bold mb-6 text-white">Debug Console</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {debugData.timestamp && (
                  <div>
                    <div className="text-yellow-400 mb-2">Last Request ({debugData.timestamp}):</div>
                    <pre className="bg-gray-800 p-4 rounded overflow-auto text-xs">
                      {JSON.stringify(debugData.lastRequest, null, 2)}
                    </pre>
                  </div>
                )}

                {debugData.lastResponse && (
                  <div>
                    <div className="text-blue-400 mb-2">Last Response:</div>
                    <pre className="bg-gray-800 p-4 rounded overflow-auto text-xs">
                      {JSON.stringify(debugData.lastResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {!debugData.timestamp && <div className="text-gray-500 text-center py-8">No API calls yet...</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
