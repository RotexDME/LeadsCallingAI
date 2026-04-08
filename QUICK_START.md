# Quick Start Guide - AI Voice Call API

## What You've Got

A complete REST API system for making AI-powered voice calls with:

- **Database tracking** - All calls stored in Supabase
- **Full transcripts** - Every conversation recorded
- **Analytics** - Call metrics and performance data
- **Webhook support** - Real-time call status updates
- **Contact management** - Automatic contact creation
- **Bulk calling** - Queue multiple calls at once

## Prerequisites

Before you start, you need:

1. **LiveKit Account** - Get from https://cloud.livekit.io
2. **Deepgram API Key** - Get from https://console.deepgram.com
3. **OpenAI API Key** - Get from https://platform.openai.com
4. **Vobiz SIP Trunk** - For making actual phone calls (optional for testing)
5. **Supabase Account** - Database is already set up

## Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`:
   ```
   # LiveKit
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret

   # Speech Services
   DEEPGRAM_API_KEY=your_deepgram_key

   # AI Models
   OPENAI_API_KEY=your_openai_key

   # SIP Trunk (for real phone calls)
   VOBIZ_SIP_TRUNK_ID=your_trunk_id
   VOBIZ_SIP_DOMAIN=your_sip_domain

   # Database
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Configure dashboard environment:
   ```bash
   cd dashboard
   cp .env.example .env
   ```

   Fill in the dashboard `.env` with the same credentials.

### Step 2: Install Dependencies

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install Node.js dependencies:
   ```bash
   cd dashboard
   npm install
   cd ..
   ```

### Step 3: Start the Services

You need TWO terminal windows:

**Terminal 1 - Python Agent:**
```bash
python agent.py start
```

This starts the AI agent that handles conversations.

**Terminal 2 - API Server:**
```bash
cd dashboard
npm run dev
```

This starts the REST API on http://localhost:3000

## Using the API

### Make a Single Call

```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "prompt": "You are calling to confirm an appointment for tomorrow at 2 PM",
    "voice": "alloy",
    "contactName": "John Doe"
  }'
```

Response:
```json
{
  "success": true,
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "call-919876543210-5432",
  "sipCallId": "sip-call-abc123"
}
```

### Make Bulk Calls

```bash
curl -X POST http://localhost:3000/api/queue \
  -H "Content-Type: application/json" \
  -d '{
    "numbers": ["+919876543210", "+919876543211"],
    "prompt": "You are calling to remind about the event on Friday"
  }'
```

### Get Call History

```bash
curl http://localhost:3000/api/calls?status=completed&limit=10
```

### Get Call Details with Transcript

```bash
curl http://localhost:3000/api/calls/550e8400-e29b-41d4-a716-446655440000
```

### Get Analytics

```bash
curl http://localhost:3000/api/analytics
```

## API Endpoints

All endpoints are documented in `API_DOCUMENTATION.md`

### Main Endpoints:

- `POST /api/dispatch` - Make a single call
- `POST /api/queue` - Make bulk calls
- `GET /api/calls` - Get call history
- `GET /api/calls/{id}` - Get call details
- `GET /api/analytics` - Get analytics
- `POST /api/webhook/call-status` - Update call status
- `POST /api/webhook/transcript` - Add transcript

## Database Schema

The system automatically created these tables in Supabase:

1. **contacts** - Contact information
2. **calls** - Call records with status
3. **call_transcripts** - Full conversation transcripts
4. **call_analytics** - Call metrics and analytics

All tables have Row Level Security enabled.

## Customizing the AI

Edit `config.py` to customize:

- AI personality and instructions
- Voice provider (OpenAI, Deepgram, Sarvam)
- Language model (OpenAI GPT, Groq Llama)
- Initial greeting message
- Voice selection

Example:
```python
SYSTEM_PROMPT = """
You are a friendly assistant calling from XYZ Company.
Keep responses short and polite.
"""

DEFAULT_TTS_VOICE = "alloy"  # or "shimmer", "nova", etc.
DEFAULT_LLM_MODEL = "gpt-4o-mini"
```

## Testing Without Phone Calls

If you don't have a SIP trunk yet, you can still test the API:

1. Set `VOBIZ_SIP_TRUNK_ID` to any value
2. The system will create call records in the database
3. You'll get proper error messages (which you can ignore for testing)
4. All database and webhook functionality will work

## Monitoring Calls

### View in Supabase Dashboard

1. Go to your Supabase project
2. Open the Table Editor
3. View `calls`, `contacts`, `call_transcripts` tables

### Using the API

```bash
# Get recent calls
curl http://localhost:3000/api/calls?limit=5

# Get specific call with transcript
curl http://localhost:3000/api/calls/{callId}

# Get analytics
curl http://localhost:3000/api/analytics
```

## Voice Options

### OpenAI Voices (English)
- alloy - Neutral, balanced
- echo - Clear, professional
- fable - Warm, expressive
- onyx - Deep, authoritative
- nova - Friendly, energetic
- shimmer - Soft, calm

### Sarvam Voices (Indian Accents)
- anushka - Female Hindi/English
- aravind - Male Hindi/English
- amartya - Male
- dhruv - Male

## Model Providers

### OpenAI (Default)
- Model: gpt-4o-mini
- Best for quality
- Medium cost

### Groq (Faster & Cheaper)
- Model: llama-3.3-70b-versatile
- Best for speed
- Lower cost
- Set via `modelProvider: "groq"`

## Common Issues

### "SIP Trunk not configured"
- Add `VOBIZ_SIP_TRUNK_ID` to your `.env` file
- Or ignore if just testing the API

### "Missing Supabase credentials"
- Add Supabase URL and key to both `.env` files
- Check `.env.example` for format

### Agent not responding
- Make sure `python agent.py start` is running
- Check LiveKit credentials are correct
- Verify Deepgram and OpenAI keys

### Build errors
- Run `npm install` in dashboard folder
- Clear cache: `rm -rf dashboard/.next`
- Try again: `npm run build`

## Next Steps

1. **Add Authentication** - Secure your API endpoints
2. **Add Rate Limiting** - Prevent abuse
3. **Set up Webhooks** - Get real-time updates from LiveKit
4. **Create a UI** - Build a dashboard to manage calls
5. **Add Analytics** - Track success rates and metrics
6. **Integrate with CRM** - Connect to your existing systems

## Support

- Full API docs: `API_DOCUMENTATION.md`
- LiveKit docs: https://docs.livekit.io
- Supabase docs: https://supabase.com/docs

## Example Integration

```javascript
// Example: Make a call from your app
async function makeCall(phoneNumber, message) {
  const response = await fetch('http://localhost:3000/api/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber,
      prompt: message,
      voice: 'alloy',
      modelProvider: 'openai'
    })
  });

  const result = await response.json();
  console.log('Call started:', result.callId);
  return result;
}

// Use it
makeCall('+919876543210', 'Calling to confirm your appointment');
```

That's it! You now have a complete AI voice calling system with REST API access.
