# USSD Emulator - AI Coding Assistant Instructions

## Project Overview

This is a Next.js-based USSD emulator that demonstrates Customer Data Platform (CDP) capabilities for African telcos. The app simulates both smartphone and feature phone interfaces for USSD interactions, with server-side personalization based on customer profiles.

## Architecture Patterns

### Component Structure

- **Phone Interfaces**: `SmartPhone.tsx` and `FeaturePhone.tsx` are device-specific UI components with different interaction patterns
  - SmartPhone: Uses popup dialogs for USSD interactions with manual submit buttons
  - FeaturePhone: Uses inline display with auto-submit on single digit keypad presses
- **Session Management**: Session state flows from `page.tsx` → `PhoneSelector.tsx` → device components via props
- **API Communication**: All USSD requests go through `/api/ussd/route.ts` with menuPath tracking for navigation
- **Real-time Updates**: Both components update time and battery percentage every minute

### Key Data Flow

1. User selects phone number → Session created with unique ID
2. USSD code sent → API processes with customer profile lookup
3. Personalized response generated → UI updates with offers/menus
4. User input cycles through menu navigation using menuPath array to track state
5. FeaturePhone auto-submits single digits, SmartPhone requires manual submission
6. Session continues until completion or cancellation

### Personalization Engine

The CDP logic lives in `/api/ussd/route.ts`:

- Customer profiles stored in `mockCustomers` object
- `getPersonalizedOffers()` function applies segment-based pricing and recommendations
- Offers marked as "recommended" appear first and with special styling

## Development Patterns

### TypeScript Interfaces

All types are centralized in `/app/types/index.ts`. Key interfaces:

- `SessionData` - Current session state
- `USSDRequest/USSDResponse` - API contract
- `CustomerProfile` - User data for personalization
- `Offer` - Bundle/product structure

### State Management

- Session state uses React `useState` at root level
- Phone numbers persist via `localStorage` (key: "ussd-saved-numbers")
- No external state library - keep it simple

### API Route Patterns

- Use `NextRequest`/`NextResponse` for type safety
- Validate required fields before processing
- Return consistent error structures
- Mock data should be easily configurable for demos

## Common Tasks

### Adding New USSD Codes

1. Add case in `/api/ussd/route.ts` switch statement
2. Return appropriate `USSDResponse` object
3. Add to `commonUssdCodes` array in `PhoneSelector.tsx` for quick access

### Modifying Customer Segments

Edit `mockCustomers` object and update `getPersonalizedOffers()` logic for new personalization rules.

### Styling Device Interfaces

- Smartphone: Modern touch UI with rounded corners, shadows, popup dialogs
- Feature phone: Monospace font, terminal aesthetic, inline text responses (no clickable buttons)
- Use Tailwind utility classes consistently
- Status bars show time (left), carrier (center), signal/battery (right)

### Session Flow Debugging

- Check session data in browser DevTools - session ID and menuStack help track navigation state
- menuPath array shows current navigation depth: [] = initial, ["1"] = first selection, ["1", "2"] = confirmation
- USSD responses include continueSession boolean and menuOptions array
- Debug logs in API show menuPath progression and confirmation logic

### Critical Implementation Notes

- FeaturePhone must NOT use clickable buttons for menu options - only display text
- SmartPhone uses popup dialogs, FeaturePhone uses inline display
- Auto-submit behavior: FeaturePhone submits on single digit press, SmartPhone requires explicit submission
- Menu confirmation logic uses menuPath.length >= 2 to handle purchase confirmations
- Battery percentage = 100 - current minute past hour, updates every minute
- Time display uses 24-hour format (HH:MM) in browser local time

## Testing Scenarios

Use these phone numbers for different demo flows:

- `+254712345678` - Premium customer (discounts applied)
- `+254723456789` - Regular customer (standard pricing)
- `+254734567890` - Low-usage customer (small bundle discounts)

### USSD Flow Testing

1. **Data Bundle Purchase**: `*444#` → select bundle → confirm with "1" → success message
2. **Feature Phone Auto-Submit**: Press single digits on keypad, should auto-submit without # key
3. **SmartPhone Manual Submit**: Enter digits in popup, press Send button to submit
4. **Menu Navigation**: Test multi-level menus with proper menuPath tracking
5. **Session Termination**: Confirm purchases end sessions (continueSession: false)

### Real-time Feature Testing

- Battery percentage should decrease each minute based on current time
- Time display should update every minute
- Status bar layout: time (left), "Unitel" (center), signal/battery% (right)

## Performance Notes

- Component re-renders minimized through careful prop passing
- API responses are synchronous (no database calls)
- Mock data loads instantly for smooth demos

## Demo Configuration

Use `/api/config` endpoint to dynamically update customer profiles and pricing during live demonstrations.
