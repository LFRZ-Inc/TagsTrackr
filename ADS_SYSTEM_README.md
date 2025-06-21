# TagsTrackr Ethical Ads System

## 🎯 Overview

A fully functional ethical ad system for TagsTrackr with support for ad banners, cross-promos, optional ad credit rewards, and Premium subscription removal. Built with ethics-first approach focusing on user privacy and non-intrusive advertising.

## ✨ Features

### Core Ad System
- **Contextual Ad Banners**: Rotating ads based on page context (dashboard, track, account, general)
- **Credit Earning**: Users earn $0.01 per ad view (max 5/day)
- **Credit Redemption**: Redeem $5 in credits for tag discounts or Premium trials
- **Premium Ad-Free**: Premium users see no ads and enjoy unlimited features

### Privacy-First Design
- **Non-targeted ads**: Selected based on page context, not user profiling
- **No data selling**: User privacy is protected
- **Transparent tracking**: Users know exactly what's tracked
- **Opt-out options**: Easy ad preference controls

### User Experience
- **Beautiful UI**: Clean, non-intrusive ad designs
- **Credit animations**: Engaging feedback when earning credits
- **Progressive disclosure**: Clear information about how the system works
- **Mobile responsive**: Optimized for all screen sizes

## 🚀 Quick Setup

### 1. Database Schema Setup

Apply the ads system schema to your Supabase project:

```bash
# Connect to your Supabase project and run the SQL file
psql -h your-project.supabase.co -U postgres -d postgres -f ads-schema-extension.sql
```

Or copy/paste the contents of `ads-schema-extension.sql` into your Supabase SQL editor.

### 2. Environment Variables

Ensure your `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

All required dependencies are already in `package.json`:

```bash
npm install
# or
yarn install
```

### 4. Start Development

```bash
npm run dev
# or
yarn dev
```

## 📊 Database Schema

### New Tables

#### `ads` - Store advertising content
- Contextual targeting (dashboard, track, account, general)
- Priority system for ad rotation
- Active/inactive status and date ranges
- View and click tracking

#### `ad_views` - Track user interactions
- User view history with timestamps
- Click tracking
- Session and IP logging for analytics
- Context-aware tracking

#### `ad_credits` - Manage user earnings
- Credit balance and earning history
- Daily view limits (5 views/day max)
- Redemption tracking

#### `ad_redemptions` - Credit redemption history
- Track all redemption attempts
- Support for different redemption types
- Approval workflow for manual processing

### Enhanced Tables

#### `users` - Added Premium status
- `is_premium` field for subscription management
- RLS policies updated for ad system

## 🎨 Component Architecture

### `AdBanner` Component
**Location**: `src/components/ads/AdBanner.tsx`

**Props**:
- `pageContext`: 'dashboard' | 'track' | 'account' | 'general'
- `className?`: Optional styling
- `compact?`: Compact layout for smaller spaces

**Features**:
- Automatic ad selection based on context and priority
- Credit earning with visual feedback
- Click tracking and external link handling
- Premium user detection
- Responsive design with Tailwind CSS

### Store Integration
**Location**: `src/lib/store.ts`

**New State**:
- `ads`: Current ads array
- `adCredits`: User credit information
- `userProfile`: Enhanced with premium status
- `showAds`: User preference setting

**Helper Functions**:
- `useIsPremium()`: Check premium status
- `useShouldShowAds()`: Determine ad visibility

## 🛠️ API Routes

### `/api/ads/track` - Ad Interaction Tracking
- **POST**: Track ad views and clicks
- Handles credit earning logic
- Updates ad performance metrics
- IP and user agent logging

### `/api/ads/redeem` - Credit Redemption
- **POST**: Process credit redemptions
- **GET**: Fetch user credits and redemption history
- Validation and approval workflow

## 🎛️ Admin Features

### Sample Ads Included
Pre-populated with contextual ads for:
- Premium upgrades
- Tag discounts
- Travel insurance partnerships
- Lost & found services
- Smart luggage recommendations
- Airport lounge access

### Ad Management
Admins can manage ads through Supabase dashboard:
- Create/edit/deactivate ads
- Set priority levels
- Configure date ranges
- Monitor performance metrics

## 💳 Premium Integration

### Premium Benefits
- **Ad-free experience**: No ads shown to premium users
- **Unlimited tags**: Remove free plan limitations
- **Extended history**: 1-year location history vs 30 days
- **Priority support**: Enhanced customer service
- **Advanced analytics**: Detailed insights and reports

### Upgrade Flow
- One-click premium upgrade in account settings
- Credit-based premium trials
- Clear benefit comparison
- Ethical pricing transparency

## 🔒 Privacy & Ethics

### Data Protection
```markdown
Your Data Is Yours. Your Screen Helps Us Grow.

We show helpful, non-targeted ads only to users on the free plan. 
These are selected based on what you're doing — not who you are. 
We don't sell your data, track your behavior, or let third parties follow you.

We're here to track items, not people.
```

### GDPR Compliance
- Minimal data collection
- Clear consent mechanisms
- Easy opt-out options
- Data deletion capabilities

## 📱 User Experience

### Dashboard Integration
- Non-intrusive ad placement after stats cards
- Contextual ads relevant to dashboard usage
- Credit earning opportunities

### Track Page Integration
- Travel-related ad context
- Insurance and recovery service promotions
- Location-aware (but not location-tracked) content

### Account Management
- Comprehensive credit management
- Clear redemption options
- Ad preference controls
- Premium upgrade path

## 🔧 Development

### Component Testing
```tsx
// Test AdBanner component
import { render, screen } from '@testing-library/react'
import AdBanner from '@/components/ads/AdBanner'

test('renders ad banner for dashboard context', () => {
  render(<AdBanner pageContext="dashboard" />)
  // Add your test assertions
})
```

### Database Functions
Key PostgreSQL functions:
- `process_ad_view()`: Handles view tracking and credit earning
- `redeem_ad_credits()`: Processes credit redemptions
- Automatic daily limit enforcement

### Real-time Updates
- Ad credits update in real-time
- Daily limit tracking
- Premium status changes reflect immediately

## 🚀 Deployment

### Production Checklist
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Sample ads loaded
- [ ] RLS policies tested
- [ ] Premium upgrade flow tested
- [ ] Credit earning verified
- [ ] Redemption workflow validated

### Monitoring
Monitor key metrics:
- Ad view rates
- Credit earning patterns
- Premium conversion rates
- User engagement with ads

## 🤝 Contributing

### Adding New Ad Contexts
1. Update `pageContext` type in AdBanner
2. Add context to database schema
3. Create sample ads for new context
4. Update RLS policies if needed

### Extending Credit System
1. Add new redemption types to schema
2. Update redemption function
3. Add UI for new redemption options
4. Test approval workflow

## 📈 Metrics & Analytics

Track important KPIs:
- **Ad Performance**: View rates, click-through rates
- **User Engagement**: Credit earning patterns, redemption rates
- **Revenue Impact**: Premium conversion rates
- **User Satisfaction**: Ad dismissal rates, feedback

## 🆘 Support

### Common Issues

**Ads not showing**: 
- Check premium status
- Verify ad preferences
- Ensure ads exist for page context

**Credits not earning**:
- Verify daily limit (5 views/day)
- Check if user is premium
- Confirm database function execution

**Redemption failing**:
- Verify sufficient credit balance
- Check redemption type validity
- Review approval workflow

### Debug Mode
Enable debug logging:
```tsx
// In AdBanner component
console.log('Ad debug:', { shouldShowAds, currentAd, adCredits })
```

## 🎉 Success Metrics

The ads system aims to achieve:
- **95%+ user satisfaction** with non-intrusive ads
- **5-10% premium conversion** rate from free users
- **$0.01-0.05 average** credit earning per user per day
- **Ethical advertising** standards maintained

---

**Built with ❤️ for TagsTrackr users who value privacy and choice.** 