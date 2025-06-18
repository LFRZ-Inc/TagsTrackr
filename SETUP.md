# TagsTrackr Setup Guide

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/LFRZ-Inc/TagsTrackr.git
   cd TagsTrackr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema in `supabase-schema.sql` in your Supabase SQL editor
   - Get your project URL and anon key from Settings → API

4. **Configure environment variables**
   Create `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://fshmlrchvhrcbebfcoqz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaG1scmNodmhyY2JlYmZjb3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMDk0NzgsImV4cCI6MjA2NTc4NTQ3OH0.ZrTHjQrPzG5A-vjBIEnXHFWbhDMKpLr2jpkf9SOjbMA
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Main app: http://localhost:3000
   - Admin panel: http://localhost:3000/admin

## Features Overview

### For Everyone
- **Luggage Tracking**: Perfect for airline travel with real-time location updates
- **Package Monitoring**: Track shipments and deliveries
- **Personal Items**: Laptops, cameras, jewelry, and other valuables
- **Business Equipment**: Company assets and tools across locations

### Airline Focus
TagsTrackr addresses the airline industry's notorious luggage handling problems:
- 28+ million bags mishandled annually
- Real-time tracking through airports and connecting flights
- Instant alerts for unusual movement
- Integration with airline partner systems

## Database Schema

The `supabase-schema.sql` file includes:
- **Users & Authentication**: Extends Supabase auth with profile data
- **Tags Management**: GPS trackers with metadata and status
- **GPS Pings**: Real-time location data with sensor information
- **Reports System**: Lost/found reporting with rewards
- **Geofencing**: Safe zones and restricted area monitoring
- **Partner Integration**: Airlines, shipping companies, hotels
- **Notifications**: Real-time alerts and updates

## Admin Panel Features

Access the admin panel at `/admin` for:
- **GPS Ping Simulator**: Test different route types (airport, shipping, hotel)
- **System Status**: Monitor database and API health
- **Quick Actions**: Register test tags, view dashboard
- **Development Tools**: API endpoint testing and debugging

### Using the Ping Simulator
1. Enter a test tag ID (e.g., "TEST-001")
2. Select route type:
   - **Airport Journey**: JFK to LAX simulation (45 minutes)
   - **Package Delivery**: Warehouse to doorstep (2 hours)
   - **Hotel Transfer**: Airport to hotel (30 minutes)
3. Click "Start Simulation" to generate realistic GPS data
4. Monitor the real-time log for ping updates

## API Endpoints

### POST /api/ping
Receive GPS pings from tracking devices
```json
{
  "tag_id": "TT12345ABC",
  "latitude": 40.6413,
  "longitude": -73.7781,
  "accuracy": 5.2,
  "battery_level": 85,
  "signal_strength": -65,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /api/register-tag
Register a new tracking tag
```json
{
  "tag_id": "TT12345ABC",
  "name": "Main Luggage",
  "description": "Black suitcase with red ribbon"
}
```

### GET /api/track/[tagId]
Get current location and history for a tag

## Key Technologies

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Zustand
- **UI Components**: Lucide React icons
- **Maps**: Ready for Google Maps/Mapbox integration
- **Real-time**: Supabase realtime subscriptions

## Development Workflow

1. **Code Changes**: Make your changes and test locally
2. **Database Updates**: Update `supabase-schema.sql` for schema changes
3. **Testing**: Use the admin panel simulator for GPS testing
4. **Commit & Push**: 
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

## Production Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Security Considerations

- **Row Level Security**: Enabled on all Supabase tables
- **API Keys**: Keep service role keys secure and server-side only
- **CORS**: Configure for production domains
- **Rate Limiting**: Implement for ping endpoints in production

## Support & Contributing

- **Issues**: Report bugs on GitHub Issues
- **Features**: Submit feature requests with use cases
- **Pull Requests**: Welcome for improvements and fixes
- **Documentation**: Help improve setup and usage docs

## License

This project is open source. See LICENSE file for details.

---

🎯 **Ready to never lose anything again?** Start tracking with TagsTrackr! 