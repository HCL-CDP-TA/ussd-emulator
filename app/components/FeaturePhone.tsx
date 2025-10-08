"use client"

import { useState, useEffect, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { Phone, PhoneOff, Signal, Voicemail } from "lucide-react"
import { SessionData, USSDResponse, USSDRequest } from "../types"

interface FeaturePhoneProps {
  currentNumber: string
  phoneIMEIMap: Record<string, string>
  sessionData: SessionData
  onSessionUpdate: (data: SessionData) => void
  onDebugUpdate: (data: { lastRequest?: USSDRequest; lastResponse?: USSDResponse; timestamp?: string }) => void
}

export default function FeaturePhone({
  currentNumber,
  phoneIMEIMap,
  sessionData,
  onSessionUpdate,
  onDebugUpdate,
}: FeaturePhoneProps) {
  const [currentInput, setCurrentInput] = useState("")
  const [ussdInput, setUssdInput] = useState("")
  const [ussdResponse, setUssdResponse] = useState<USSDResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pressedButton, setPressedButton] = useState<string | null>(null)
  const [batteryPercentage, setBatteryPercentage] = useState(100)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
        return
      }

      const key = event.key

      // Handle number keys, * and #
      if (/^[0-9*#]$/.test(key)) {
        event.preventDefault()
        setPressedButton(key)
        if (ussdResponse && ussdResponse.continueSession) {
          // For USSD responses, auto-submit single digit responses
          if (/^[0-9]$/.test(key)) {
            setUssdInput(key)
            setTimeout(() => {
              sendUSSDRequest(sessionData.currentMenu, key)
              setUssdInput("")
            }, 200)
          } else if (key === "#") {
            // For # key, submit current input if any
            const input = ussdInput + key
            setUssdInput(input)
            setTimeout(() => {
              sendUSSDRequest(sessionData.currentMenu, input)
              setUssdInput("")
            }, 200)
          } else {
            // For * and other keys, just add to input
            setUssdInput(prev => prev + key)
          }
        } else {
          const newInput = currentInput + key
          setCurrentInput(newInput)
          // Auto-send when USSD code ends with #
          if (key === "#" && newInput.startsWith("*")) {
            setTimeout(() => {
              sendUSSDRequest(newInput)
              setCurrentInput("")
            }, 200)
          }
        }
        setTimeout(() => setPressedButton(null), 150)
      }

      // Handle backspace
      if (key === "Backspace") {
        event.preventDefault()
        setPressedButton("backspace")
        if (ussdResponse && ussdResponse.continueSession) {
          setUssdInput(prev => prev.slice(0, -1))
        } else {
          setCurrentInput(prev => prev.slice(0, -1))
        }
        setTimeout(() => setPressedButton(null), 150)
      }

      // Handle enter key for USSD auto-send
      if (key === "Enter") {
        event.preventDefault()
        if (ussdResponse && ussdResponse.continueSession && ussdInput.trim()) {
          sendUSSDRequest(sessionData.currentMenu, ussdInput)
          setUssdInput("")
        } else if (currentInput.trim() && currentInput.includes("*") && currentInput.includes("#")) {
          sendUSSDRequest(currentInput)
          setCurrentInput("")
        }
      }

      // Handle escape as soft left (back)
      if (key === "Escape") {
        event.preventDefault()
        setPressedButton("soft-left")
        if (ussdResponse) {
          setUssdResponse(null)
        }
        setTimeout(() => setPressedButton(null), 150)
      }

      // Handle escape as soft left (back)
      if (key === "Escape") {
        event.preventDefault()
        setPressedButton("soft-left")
        if (ussdResponse) {
          setUssdResponse(null)
        }
        setTimeout(() => setPressedButton(null), 150)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [ussdResponse, currentInput, ussdInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendUSSDRequest = useCallback(
    async (code: string, input?: string) => {
      // Debug: log currentNumber value
      console.log("FeaturePhone sendUSSDRequest - currentNumber:", currentNumber)

      // Validate that a phone number is selected
      if (!currentNumber) {
        alert("Please select a phone number first")
        return
      }

      // Auto-create session if needed when sending USSD code
      let currentSessionId = sessionData.sessionId
      let currentPhoneNumber = currentNumber

      if (!currentSessionId && code.startsWith("*")) {
        // Generate simple session ID
        currentSessionId = uuidv4()

        // Use the current number from props
        if (!currentPhoneNumber) {
          currentPhoneNumber = "+254712345678" // Default fallback
        }

        onSessionUpdate({
          phoneNumber: currentPhoneNumber,
          sessionId: currentSessionId,
          currentMenu: "",
          menuStack: [],
        })
      }

      if (!currentPhoneNumber) return

      setLoading(true)
      try {
        // Build menuStack BEFORE sending request
        let currentMenuStack = sessionData.menuStack
        if (input) {
          // User provided input (menu selection), add to stack
          currentMenuStack = [...sessionData.menuStack, input]
        } else if (code.startsWith("*") && code.endsWith("#")) {
          // New USSD code, reset stack
          currentMenuStack = []
        }

        const requestData = {
          phoneNumber: currentPhoneNumber,
          sessionId: currentSessionId,
          ussdCode: code,
          imei: phoneIMEIMap[currentPhoneNumber] || "",
          input,
          menuPath: currentMenuStack,
        }

        const response = await fetch("/api/ussd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        })

        const data: USSDResponse = await response.json()
        setUssdResponse(data)
        setUssdInput("") // Clear USSD input for user response

        // Update debug info
        onDebugUpdate({
          lastRequest: requestData,
          lastResponse: data,
          timestamp: new Date().toLocaleTimeString(),
        })

        if (data.continueSession) {
          onSessionUpdate({
            phoneNumber: currentPhoneNumber,
            sessionId: data.sessionId,
            currentMenu: code,
            menuStack: currentMenuStack,
          })
        }
      } catch (error) {
        console.error("USSD request failed:", error)
      } finally {
        setLoading(false)
      }
    },
    [currentNumber, phoneIMEIMap, sessionData, onSessionUpdate, onDebugUpdate],
  )

  // Listen for execute events from PhoneSelector
  useEffect(() => {
    const handleExecuteUSSD = (event: CustomEvent) => {
      setCurrentInput(event.detail)
      sendUSSDRequest(event.detail)
    }

    window.addEventListener("executeUSSD", handleExecuteUSSD as EventListener)
    return () => window.removeEventListener("executeUSSD", handleExecuteUSSD as EventListener)
  }, [currentNumber, sendUSSDRequest])

  // Battery percentage based on minutes past current hour and time display
  useEffect(() => {
    const updateBatteryAndTime = () => {
      const now = new Date()
      const minutesPastHour = now.getMinutes()
      const newBatteryPercentage = Math.max(0, 100 - minutesPastHour)
      setBatteryPercentage(newBatteryPercentage)
      setCurrentTime(now)
    }

    // Update immediately
    updateBatteryAndTime()

    // Update every minute
    const interval = setInterval(updateBatteryAndTime, 60000)

    return () => clearInterval(interval)
  }, [])

  const handleKeypadClick = (key: string) => {
    setPressedButton(key)
    setTimeout(() => setPressedButton(null), 150)

    if (ussdResponse && ussdResponse.continueSession) {
      const newInput = ussdInput + key
      setUssdInput(newInput)
      // Auto-submit single digit responses for feature phone
      if (/^[0-9]$/.test(key)) {
        setTimeout(() => {
          sendUSSDRequest(sessionData.currentMenu || "*444#", newInput)
          setUssdInput("")
        }, 200)
      }
      // Auto-send on # for USSD responses
      else if (key === "#") {
        setTimeout(() => {
          sendUSSDRequest(sessionData.currentMenu || "*444#", newInput)
          setUssdInput("")
        }, 200)
      }
    } else {
      const newInput = currentInput + key
      setCurrentInput(newInput)
      // Auto-send when USSD code ends with #
      if (key === "#" && newInput.startsWith("*")) {
        setTimeout(() => {
          sendUSSDRequest(newInput, newInput)
          setCurrentInput("")
        }, 200)
      }
    }
  }

  const keypadLayout = [
    [
      { key: "1", sub: "", hasVoicemail: true },
      { key: "2", sub: "ABC" },
      { key: "3", sub: "DEF" },
    ],
    [
      { key: "4", sub: "GHI" },
      { key: "5", sub: "JKL" },
      { key: "6", sub: "MNO" },
    ],
    [
      { key: "7", sub: "PQRS" },
      { key: "8", sub: "TUV" },
      { key: "9", sub: "WXYZ" },
    ],
    [
      { key: "*", sub: "" },
      { key: "0", sub: "" },
      { key: "#", sub: "" },
    ],
  ]

  return (
    <div className="relative">
      {/* Phone Frame */}
      <div className="bg-gray-900 p-4 rounded-3xl shadow-2xl w-80">
        {/* Screen */}
        <div className="bg-gray-100 p-3 rounded-lg mb-3">
          <div className="bg-white text-gray-800 p-4 rounded font-mono text-xs h-[380px] flex flex-col">
            {/* Status Bar - smartphone style */}
            <div className="flex justify-between items-center text-xs text-gray-500 mb-4 flex-shrink-0">
              <span className="font-mono">
                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              <span className="font-bold">Unitel</span>
              <div className="flex items-center space-x-1">
                <Signal className="w-3 h-3" />
                <span>{batteryPercentage}%</span>
              </div>
            </div>

            {/* Content Area with fixed height and scroll */}
            <div className="flex-1 overflow-y-auto">
              {/* Current Input */}
              {(currentInput || ussdInput) && (
                <div className="mb-2">
                  <span className="text-gray-700 text-base font-medium">
                    {ussdResponse && ussdResponse.continueSession ? ussdInput : currentInput}
                  </span>
                </div>
              )}

              {/* USSD Response */}
              {ussdResponse && (
                <div className="space-y-1">
                  <div className="whitespace-pre-line text-sm text-gray-700">{ussdResponse.message}</div>
                </div>
              )}

              {loading && <div className="text-gray-500 animate-pulse text-sm">Processing...</div>}
            </div>
          </div>
        </div>

        {/* Feature Phone Control Buttons - 2 rows of 3 */}
        <div className="space-y-2 mb-3">
          {/* Top row: Left Soft | Up | Right Soft */}
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setPressedButton("soft-left")
                // Handle soft left button action
                if (ussdResponse) {
                  setUssdResponse(null) // Back/Cancel
                }
                setTimeout(() => setPressedButton(null), 150)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 transform ${
                pressedButton === "soft-left"
                  ? "bg-gray-600 text-gray-200 scale-95 shadow-sm"
                  : "bg-gray-700 hover:bg-gray-600 text-white shadow-md"
              }`}>
              <div className="w-4 h-0.5 bg-white mx-auto"></div>
            </button>

            <button
              onClick={() => {
                setPressedButton("nav-up")
                setTimeout(() => setPressedButton(null), 150)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 transform ${
                pressedButton === "nav-up"
                  ? "bg-gray-600 text-gray-200 scale-95 shadow-sm"
                  : "bg-gray-700 hover:bg-gray-600 text-white shadow-md"
              }`}>
              ▲
            </button>

            <button
              onClick={() => {
                setPressedButton("soft-right")
                // Handle soft right button action
                setTimeout(() => setPressedButton(null), 150)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 transform ${
                pressedButton === "soft-right"
                  ? "bg-gray-600 text-gray-200 scale-95 shadow-sm"
                  : "bg-gray-700 hover:bg-gray-600 text-white shadow-md"
              }`}>
              <div className="w-4 h-0.5 bg-white mx-auto"></div>
            </button>
          </div>

          {/* Bottom row: Green Call | Down | Red End */}
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setPressedButton("call-button")
                // Handle call initiation
                if (currentInput.trim() && currentInput.includes("*") && currentInput.includes("#")) {
                  sendUSSDRequest(currentInput)
                  setCurrentInput("")
                } else if (ussdResponse && ussdResponse.continueSession && ussdInput.trim()) {
                  sendUSSDRequest(sessionData.currentMenu, ussdInput)
                  setUssdInput("")
                }
                setTimeout(() => setPressedButton(null), 150)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 transform ${
                pressedButton === "call-button"
                  ? "bg-green-600 text-green-100 scale-95 shadow-sm"
                  : "bg-green-700 hover:bg-green-600 text-white shadow-md"
              }`}>
              <Phone className="w-4 h-4 mx-auto" />
            </button>

            <button
              onClick={() => {
                setPressedButton("nav-down")
                setTimeout(() => setPressedButton(null), 150)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 transform ${
                pressedButton === "nav-down"
                  ? "bg-gray-600 text-gray-200 scale-95 shadow-sm"
                  : "bg-gray-700 hover:bg-gray-600 text-white shadow-md"
              }`}>
              ▼
            </button>

            <button
              onClick={() => {
                setPressedButton("end-button")
                // Handle call termination / back to idle
                setUssdResponse(null)
                setCurrentInput("")
                setUssdInput("")
                setTimeout(() => setPressedButton(null), 150)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-150 transform ${
                pressedButton === "end-button"
                  ? "bg-red-600 text-red-100 scale-95 shadow-sm"
                  : "bg-red-700 hover:bg-red-600 text-white shadow-md"
              }`}>
              <PhoneOff className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* Keypad */}
        <div className="space-y-2">
          {keypadLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex space-x-2">
              {row.map(button => (
                <button
                  key={button.key}
                  onClick={() => handleKeypadClick(button.key)}
                  className={`flex-1 rounded-lg py-2 text-center transition-all duration-150 transform ${
                    pressedButton === button.key
                      ? "bg-gray-600 text-gray-200 scale-95 shadow-sm"
                      : "bg-gray-700 hover:bg-gray-600 text-white shadow-md"
                  }`}>
                  <div className="text-sm font-bold">{button.key}</div>
                  {button.hasVoicemail ? (
                    <div className="flex justify-center">
                      <Voicemail className="w-3 h-3 text-gray-300" />
                    </div>
                  ) : (
                    button.sub && <div className="text-xs text-gray-300">{button.sub}</div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
