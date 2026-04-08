import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { callId, roomName, speaker, message, sequence, timestamp } = body;

        if (!callId && !roomName) {
            return NextResponse.json({ error: "callId or roomName is required" }, { status: 400 });
        }

        if (!speaker || !message) {
            return NextResponse.json({ error: "speaker and message are required" }, { status: 400 });
        }

        let actualCallId = callId;

        if (!actualCallId && roomName) {
            const { data: call } = await supabase
                .from('calls')
                .select('id')
                .eq('room_name', roomName)
                .maybeSingle();

            actualCallId = call?.id;
        }

        if (!actualCallId) {
            console.warn(`Call not found for transcript: ${callId || roomName}`);
            return NextResponse.json({ error: "Call not found" }, { status: 404 });
        }

        const { error: insertError } = await supabase
            .from('call_transcripts')
            .insert({
                call_id: actualCallId,
                speaker,
                message,
                sequence: sequence || 0,
                timestamp: timestamp || new Date().toISOString()
            });

        if (insertError) {
            console.error("Error inserting transcript:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Transcript webhook error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
