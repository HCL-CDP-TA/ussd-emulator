# USSD Emulator - CDP Demo

A web-based USSD emulator for demonstrating Customer Data Platform (CDP) capabilities with personalized offers. Built with Next.js, this application simulates both smartphone and feature phone USSD interfaces for African telco demonstrations, using Safaricom as an example.

## Features

### 🚀 Core Functionality

- **Dual Interface Support**: Smartphone and feature phone UI emulation
- **Session Management**: Unique session IDs for each USSD interaction
- **Phone Number Management**: Save and reuse phone numbers via localStorage
- **Real-time USSD Processing**: Server-side API handling USSD codes and responses

### 📱 Device Emulation

- **Smartphone Interface**: Modern touch-friendly UI with virtual keypad and USSD popup dialogs
- **Feature Phone Interface**: Authentic monochrome display with physical keypad simulation and inline USSD responses
- **Auto-Submit Behavior**: Feature phone automatically submits single-digit responses for realistic interaction
- **Dynamic Status Bar**: Real-time clock and battery percentage that decreases each minute
- **Quick Access Codes**: One-click access to common USSD codes
- **Session Persistence**: Maintains USSD session state across menu navigation

### 🎯 CDP-Powered Personalization

- **Customer Segmentation**: Premium, Regular, and Low-usage customer tiers
- **Dynamic Offer Personalization**: Offers tailored based on usage patterns and customer segment
- **Contextual Recommendations**: Smart highlighting of relevant offers
- **Usage-Based Pricing**: Automatic discounts for different customer segments

### 📊 Demo Scenarios

- **Balance Checking** (`*144#`): Account balance and remaining bundles
- **Data Bundles** (`*444#`): Personalized data offers
- **Voice Bundles** (`*555#`): Voice minute packages
- **Special Offers** (`*234#`): CDP-driven personalized promotions
- **Account Management** (`*100#`): Customer profile information

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone and install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the emulator.

### Demo Usage

1. **Choose Device**: Switch between smartphone and feature phone interfaces
2. **Choose a Phone Number**: Enter a phone number or select from saved numbers
3. **Execute USSD Codes**: Click quick access buttons or type codes manually
4. **Experience Personalization**: Notice how offers change based on the phone number's customer profile

### Sample Phone Numbers

The demo includes pre-configured customer profiles:

- `+254712345678` - Premium customer (10% discount on combo deals)
- `+254723456789` - Regular customer (standard pricing)
- `+254734567890` - Low-usage customer (special discounts on smaller bundles)

## Technical Architecture

### Frontend Components

- `PhoneSelector`: Demo controls and session management
- `SmartPhone`: Modern smartphone USSD interface
- `FeaturePhone`: Traditional feature phone interface

### Backend APIs

- `/api/ussd` - USSD code processing with multi-level menu navigation and menuPath tracking
- `/api/config` - Demo configuration management

### Data Layer

- Customer profiles with usage patterns and preferences
- Dynamic offer generation based on customer segments
- Session state management with menuStack for navigation history
- Real-time status updates (time, battery) updated every minute

## Customization

### Adding Customer Profiles

Edit `/app/api/ussd/route.ts` to add new customer profiles:

```typescript
const mockCustomers: Record<string, CustomerProfile> = {
  "+254700000000": {
    phoneNumber: "+254700000000",
    accountBalance: 100.0,
    dataUsage: 5.0,
    voiceUsage: 60,
    preferredOffers: ["data"],
    lastTopUp: "2024-09-30",
    segment: "regular",
  },
}
```

### Modifying Offers

Update the `getPersonalizedOffers` function to customize offer logic and personalization rules.

### Configuration API

Use the `/api/config` endpoint to dynamically update customer profiles and offer multipliers during demonstrations.

## Project Structure

```
app/
├── components/           # React components
│   ├── PhoneSelector.tsx # Demo controls
│   ├── SmartPhone.tsx    # Smartphone UI
│   └── FeaturePhone.tsx  # Feature phone UI
├── api/                  # API routes
│   ├── ussd/route.ts     # USSD processing
│   └── config/route.ts   # Configuration management
├── types/                # TypeScript definitions
│   └── index.ts          # Shared interfaces
├── layout.tsx            # App layout
└── page.tsx              # Main application
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Data Storage**: JSON file-based persistence with centralized phone number management
- **Styling**: Tailwind CSS with custom phone frame designs

## Deployment

### Quick Start (Deploy Script)

```bash
# Clone repository
git clone <repository-url>
cd ussd-emulator

# Deploy latest version
./deploy.sh

# Deploy specific version
./deploy.sh v1.0.0 production

# Deploy from local directory (for development)
./deploy.sh local development --local
```

### Production Deployment

- **Automated Deployment**: Uses deploy.sh script with Docker
- **Data Persistence**: Phone numbers stored in container (see DEPLOYMENT.md for volume mounting)
- **Health Checks**: Built-in application health monitoring
- **Scalability**: Single instance recommended (JSON file storage limitation)

For detailed deployment options, scaling considerations, and production setup, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## License

This project is for demonstration purposes. Built for showcasing CDP capabilities in African telco environments.
