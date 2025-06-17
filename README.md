# TagsTrackr 🎯

A comprehensive GPS luggage tracking system built with Next.js 14, TypeScript, TailwindCSS, and Supabase. Never lose your luggage again with real-time tracking, airline partnerships, and smart notifications.

## ✨ Features

### 🚀 Core Features
- **Real-time GPS Tracking** - Track your luggage anywhere in the world
- **Smart Notifications** - Get instant alerts when your luggage moves
- **Airline Integration** - Partner dashboard for airlines and logistics companies
- **Battery Monitoring** - Track device battery levels and get low battery warnings
- **Return Incentive** - $5 reward for returning found luggage to owners
- **Mobile Responsive** - Works perfectly on all devices

### 🔐 Authentication & Security
- Secure user authentication with Supabase Auth
- Row Level Security (RLS) for data protection
- API key authentication for partner access
- End-to-end encryption for location data

### 📊 Analytics & Reporting
- User dashboard with tag statistics
- Partner analytics for airlines
- Missing luggage reporting system
- Historical location tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Styling**: TailwindCSS with custom design system
- **Deployment**: Vercel (recommended)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd TagsTrackr
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Setup

1. Create a new Supabase project
2. Copy the SQL from `supabase-setup.sql`
3. Run it in your Supabase SQL editor
4. Update your environment variables with your Supabase credentials

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📱 Pages & Features

### User Pages
- **Landing Page** (`/`) - Product information, pricing, and sign-up
- **Authentication** (`/login`, `/signup`) - User authentication
- **Dashboard** (`/dashboard`) - View registered tags and their status
- **Register Tag** (`/register-tag`) - Add new GPS tags to account
- **Track Tag** (`/track/[tagId]`) - Real-time tracking interface

### Partner Pages  
- **Partner Dashboard** (`/partner`) - Airline/logistics partner interface
- **Analytics** (`/partner/analytics`) - Tag usage and performance metrics

### API Endpoints

#### Core APIs
- `POST /api/register-tag` - Register a new tag to user account
- `POST /api/ping` - Receive GPS location updates from devices
- `GET /api/track/[tagId]` - Get current location and history of a tag
- `POST /api/report` - Submit missing/damaged luggage reports

#### Partner APIs
- `GET /api/partner/[id]/analytics` - Partner usage statistics
- `POST /api/partner/ping` - Partner-submitted location updates

## 🗄️ Database Schema

### Core Tables
- **users** - User profiles and account information
- **tags** - GPS tracking devices owned by users
- **gps_pings** - Location updates from GPS devices
- **reports** - User-submitted issues (missing, delayed, damaged)
- **partners** - Airline and logistics company information
- **pings_log** - Comprehensive analytics log

### Key Features
- Row Level Security (RLS) for data protection
- Automatic timestamp updates
- Optimized indexes for performance
- Real-time subscriptions support

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js 14 App Router pages
│   ├── api/            # API endpoints
│   ├── dashboard/      # User dashboard
│   ├── login/          # Authentication
│   ├── register-tag/   # Tag registration
│   └── track/          # Tag tracking
├── components/         # Reusable React components
├── lib/               # Utilities and configurations
│   ├── supabase.ts    # Supabase client setup
│   ├── store.ts       # Zustand state management
│   ├── utils.ts       # Helper functions
│   └── database.types.ts # TypeScript types
└── styles/            # Global styles and Tailwind config
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🌐 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
npm run start
```

## 🤝 API Integration

### Device Integration
GPS devices should send location updates to:
```
POST /api/ping
{
  "tag_id": "TT12345ABC",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 5,
  "battery_level": 85,
  "signal_strength": -65,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Partner Integration
Airlines can integrate using partner API keys:
```
GET /api/partner/analytics?api_key=your_api_key
```

## 🔒 Security

- All database access protected by Row Level Security
- API endpoints validate authentication
- Partner access controlled by API keys
- Location data encrypted in transit
- Regular security audits recommended

## 📊 Analytics & Monitoring

### User Analytics
- Tag registration and usage statistics
- Battery level monitoring
- Location ping frequency
- User engagement metrics

### Partner Analytics
- Tags used per airline
- Delayed/missing bag reports
- Recovery success rates
- Performance dashboards

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
- Verify Supabase URL and keys are correct
- Check if RLS policies are properly configured
- Ensure database tables exist

**Authentication Problems**
- Confirm Supabase Auth is enabled
- Check email confirmation settings
- Verify redirect URLs

**GPS Tracking Issues**
- Ensure device has cellular/GPS signal
- Check API endpoint availability
- Verify tag registration

## 🛣️ Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] QR code scanning for tag registration
- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with more airlines
- [ ] Geofencing alerts
- [ ] Offline mode support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, email support@tagstrackr.com or join our Discord community.

---

**Built with ❤️ by the TagsTrackr Team**

Never lose your luggage again! 🧳✈️ 