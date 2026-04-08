# AI Voice Call API Documentation

## Overview

This API allows you to make AI-powered voice calls, track call history, retrieve transcripts, and analyze call performance. All calls are stored in a Supabase database with comprehensive tracking.

## Base URL

```
http://localhost:3000/api
```

For production, replace with your deployed URL.

---

## Authentication

Currently, the API endpoints are public for webhook integration. For production use, add authentication middleware to secure endpoints.

---

## Endpoints

### 1. Make a Single Call

**POST** `/dispatch`

Initiates an AI voice call to a single phone number with custom instructions.

**Request Body:**

```json
{
  "phoneNumber": "+919876543210",
  "prompt": "You are calling to confirm an appointment for tomorrow at 2 PM. Be polite and brief.",
  "modelProvider": "openai",
  "voice": "alloy",
  "contactName": "John Doe",
  "contactEmail": "john@example.com",
  "metadata": {
    "campaign": "appointment_reminders",
    "appointment_id": "12345"
  }
}
```

**Parameters:**

- `phoneNumber` (required): Phone number with country code (e.g., +1, +91)
- `prompt` (optional): Custom instructions for the AI agent
- `modelProvider` (optional): "openai" or "groq" (default: "openai")
- `voice` (optional): Voice ID - "alloy", "echo", "shimmer" for OpenAI; "anushka", "aravind" for Sarvam
- `contactName` (optional): Name of the contact
- `contactEmail` (optional): Email of the contact
- `metadata` (optional): Additional custom fields to store with the call

**Response:**

```json
{
  "success": true,
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "call-919876543210-5432",
  "sipCallId": "sip-call-abc123"
}
```

---

### 2. Make Bulk Calls

**POST** `/queue`

Initiates AI calls to multiple phone numbers in a queue (with 200ms delay between calls).

**Request Body:**

```json
{
  "numbers": ["+919876543210", "+919876543211", "+919876543212"],
  "prompt": "You are calling to remind about the upcoming event on Friday.",
  "modelProvider": "openai",
  "voice": "alloy"
}
```

**Parameters:**

- `numbers` (required): Array of phone numbers with country codes
- `prompt` (optional): Custom instructions for the AI agent
- `modelProvider` (optional): "openai" or "groq"
- `voice` (optional): Voice ID

**Response:**

```json
{
  "success": true,
  "message": "Processed 3 numbers",
  "results": [
    {
      "phoneNumber": "+919876543210",
      "status": "dispatched",
      "callId": "550e8400-e29b-41d4-a716-446655440000",
      "sipCallId": "sip-call-abc123"
    },
    {
      "phoneNumber": "+919876543211",
      "status": "dispatched",
      "callId": "550e8400-e29b-41d4-a716-446655440001",
      "sipCallId": "sip-call-abc124"
    },
    {
      "phoneNumber": "+919876543212",
      "status": "failed",
      "error": "Invalid phone number format"
    }
  ]
}
```

---

### 3. Get Call History

**GET** `/calls`

Retrieves a list of all calls with filtering and pagination.

**Query Parameters:**

- `status` (optional): Filter by status - "initiated", "ringing", "answered", "completed", "failed", "no_answer"
- `phoneNumber` (optional): Filter by phone number
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example:**

```
GET /calls?status=completed&limit=10&offset=0
```

**Response:**

```json
{
  "success": true,
  "calls": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone_number": "+919876543210",
      "room_name": "call-919876543210-5432",
      "status": "completed",
      "direction": "outbound",
      "prompt": "You are calling to confirm an appointment",
      "model_provider": "openai",
      "voice_id": "alloy",
      "started_at": "2026-04-08T10:30:00Z",
      "answered_at": "2026-04-08T10:30:05Z",
      "ended_at": "2026-04-08T10:32:30Z",
      "duration_seconds": 145,
      "contacts": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

---

### 4. Get Call Details

**GET** `/calls/{callId}`

Retrieves detailed information about a specific call, including full transcript and analytics.

**Example:**

```
GET /calls/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "success": true,
  "call": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone_number": "+919876543210",
    "status": "completed",
    "duration_seconds": 145,
    "contacts": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+919876543210"
    }
  },
  "transcripts": [
    {
      "id": "transcript-1",
      "speaker": "ai",
      "message": "Hello, this is calling from Rapid X High School. Am I speaking with John?",
      "sequence": 1,
      "timestamp": "2026-04-08T10:30:05Z"
    },
    {
      "id": "transcript-2",
      "speaker": "user",
      "message": "Yes, this is John.",
      "sequence": 2,
      "timestamp": "2026-04-08T10:30:08Z"
    }
  ],
  "analytics": {
    "sentiment_score": 0.85,
    "user_satisfaction": 4,
    "transfer_occurred": false,
    "functions_called": ["lookup_user"],
    "avg_response_time_ms": 450
  }
}
```

---

### 5. Get Analytics

**GET** `/analytics`

Retrieves aggregated analytics across all calls.

**Query Parameters:**

- `startDate` (optional): Filter calls from this date (ISO 8601 format)
- `endDate` (optional): Filter calls until this date (ISO 8601 format)

**Example:**

```
GET /analytics?startDate=2026-04-01&endDate=2026-04-08
```

**Response:**

```json
{
  "success": true,
  "analytics": {
    "totalCalls": 150,
    "statusCounts": {
      "completed": 120,
      "failed": 10,
      "no_answer": 15,
      "answered": 5
    },
    "avgDuration": 145,
    "successRate": 80,
    "providerCounts": {
      "openai": 100,
      "groq": 50
    },
    "dateRange": {
      "start": "2026-04-01",
      "end": "2026-04-08"
    }
  }
}
```

---

### 6. Update Call Status (Webhook)

**POST** `/webhook/call-status`

Updates the status of a call. Typically called by LiveKit webhooks or your agent.

**Request Body:**

```json
{
  "event": "call.answered",
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "call-919876543210-5432",
  "status": "answered",
  "duration": 145,
  "error": null
}
```

**Parameters:**

- `event` (required): "call.answered", "call.completed", "call.failed", "call.no_answer"
- `callId` (optional): The call ID (preferred)
- `roomName` (optional): The room name (alternative to callId)
- `status` (optional): Override status
- `duration` (optional): Call duration in seconds
- `error` (optional): Error message if failed

**Response:**

```json
{
  "success": true
}
```

---

### 7. Add Transcript (Webhook)

**POST** `/webhook/transcript`

Adds a transcript entry to a call. Called during the conversation.

**Request Body:**

```json
{
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "speaker": "ai",
  "message": "Hello, how can I help you today?",
  "sequence": 1,
  "timestamp": "2026-04-08T10:30:05Z"
}
```

**Parameters:**

- `callId` (required if roomName not provided): The call ID
- `roomName` (required if callId not provided): The room name
- `speaker` (required): "ai" or "user"
- `message` (required): The spoken text
- `sequence` (optional): Order in conversation
- `timestamp` (optional): When it was spoken

**Response:**

```json
{
  "success": true
}
```

---

## Call Status Flow

1. **initiated** - Call is created and queued
2. **ringing** - SIP trunk is dialing the number
3. **answered** - User picked up the phone
4. **completed** - Call ended successfully
5. **failed** - Call failed due to error
6. **no_answer** - User did not pick up

---

## Voice Options

### OpenAI Voices
- alloy
- echo
- fable
- onyx
- nova
- shimmer

### Sarvam AI Voices (Indian accents)
- anushka (female)
- aravind (male)
- amartya (male)
- dhruv (male)

---

## Model Providers

### OpenAI
- Model: gpt-4o-mini
- Best for: Quality and reliability
- Cost: Moderate

### Groq
- Model: llama-3.3-70b-versatile
- Best for: Speed and cost efficiency
- Cost: Lower

---

## Database Schema

### Tables

1. **contacts** - Contact information
2. **calls** - Call records
3. **call_transcripts** - Conversation transcripts
4. **call_analytics** - Analytics and metrics

All tables have Row Level Security enabled for data protection.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `404` - Resource not found
- `500` - Server error

---

## Example Usage

### cURL Example

```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "prompt": "You are calling to confirm appointment for tomorrow at 2 PM",
    "voice": "alloy"
  }'
```

### JavaScript Example

```javascript
const response = await fetch('http://localhost:3000/api/dispatch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phoneNumber: '+919876543210',
    prompt: 'You are calling to confirm appointment for tomorrow at 2 PM',
    voice: 'alloy',
    contactName: 'John Doe'
  })
});

const result = await response.json();
console.log('Call ID:', result.callId);
```

### Python Example

```python
import requests

response = requests.post('http://localhost:3000/api/dispatch', json={
    'phoneNumber': '+919876543210',
    'prompt': 'You are calling to confirm appointment for tomorrow at 2 PM',
    'voice': 'alloy',
    'contactName': 'John Doe'
})

result = response.json()
print('Call ID:', result['callId'])
```

---

## Setup Instructions

1. Install dependencies:
   ```bash
   cd dashboard
   npm install
   ```

2. Configure environment variables in `.env`:
   ```
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   VOBIZ_SIP_TRUNK_ID=your_trunk_id
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Start the API server:
   ```bash
   npm run dev
   ```

4. Start the Python agent (in separate terminal):
   ```bash
   cd ..
   python agent.py start
   ```

---

## Support

For issues or questions, refer to:
- LiveKit Documentation: https://docs.livekit.io
- Supabase Documentation: https://supabase.com/docs
