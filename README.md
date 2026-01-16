# PezCRM - Cold Calling CRM

A personal CRM designed for cold calling credit unions, hospitals, and small banks. Built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Apollo Integration**: Import leads directly from Apollo with industry/employee filters
- **Power Dialer**: Click-to-call via Google Voice with call timer, notes, and outcome logging
- **Pipeline Management**: Kanban board to track leads through stages (Fresh → Won)
- **Task Management**: Follow-ups, reminders, and action items linked to contacts
- **Email Templates**: Create and use templates with variable substitution
- **Dashboard**: Track daily calls, meetings booked, and pipeline overview
- **Command Palette**: Quick navigation with ⌘K

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query + Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Apollo account (for lead import)

### Setup

1. **Clone and install dependencies**:
   ```bash
   cd pezCRM
   npm install
   ```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the migration in `supabase/migrations/001_initial_schema.sql`
   - Get your project URL and anon key from Project Settings → API

3. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

### Apollo Setup

1. Get your Apollo API key from Apollo Settings → API
2. Add it in PezCRM Settings or during import

## Usage

### Importing Leads

1. Go to **Import** page
2. Enter your Apollo API key
3. Select industry (Credit Unions, Hospitals, Banks)
4. Set employee range (1,001-5,000 recommended)
5. Choose job titles (Finance, Operations, IT leaders)
6. Preview and import contacts

### Power Dialer

1. Go to **Power Dialer**
2. Click **Start Calling Session**
3. Click **Dial in Google Voice** to initiate call
4. Take notes during the call
5. Select outcome and disposition
6. Click **Save & Next** to move to the next contact

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ⌘K | Open command palette |
| D | Dial (in dialer) |
| C | Copy phone number |
| S | Skip contact |
| Enter | Save and next |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login page
│   ├── (dashboard)/       # Main app pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── contacts/          # Contact components
│   ├── dialer/            # Power dialer components
│   ├── dashboard/         # Dashboard widgets
│   ├── pipeline/          # Kanban board
│   ├── tasks/             # Task management
│   ├── emails/            # Email templates
│   └── layout/            # Sidebar, header
├── hooks/                 # React Query hooks
├── lib/
│   ├── supabase/          # Supabase clients
│   └── apollo/            # Apollo API client
├── stores/                # Zustand stores
└── types/                 # TypeScript types
```

## Database Schema

Key tables:
- `contacts` - Contact information with Apollo data
- `calls` - Call logs with outcomes and notes
- `tasks` - Follow-ups and action items
- `email_templates` - Reusable email templates
- `activity_log` - Timeline of all activities

See `supabase/migrations/001_initial_schema.sql` for the full schema.

## Deployment

1. Push to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

## License

MIT
