import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, callId, roomName, status, duration, error } = body;

        if (!callId && !roomName) {
            return NextResponse.json({ error: "callId or roomName is required" }, { status: 400 });
        }

        let query = supabase.from('calls').select('id');

        if (callId) {
            query = query.eq('id', callId);
        } else if (roomName) {
            query = query.eq('room_name', roomName);
        }

        const { data: existingCall } = await query.maybeSingle();

        if (!existingCall) {
            console.warn(`Call not found for update: ${callId || roomName}`);
            return NextResponse.json({ error: "Call not found" }, { status: 404 });
        }

        const updateData: any = {};

        switch (event) {
            case 'call.answered':
                updateData.status = 'answered';
                updateData.answered_at = new Date().toISOString();
                break;

            case 'call.completed':
                updateData.status = 'completed';
                updateData.ended_at = new Date().toISOString();
                if (duration) {
                    updateData.duration_seconds = duration;
                }
                break;

            case 'call.failed':
                updateData.status = 'failed';
                updateData.ended_at = new Date().toISOString();
                if (error) {
                    updateData.error_message = error;
                }
                break;

            case 'call.no_answer':
                updateData.status = 'no_answer';
                updateData.ended_at = new Date().toISOString();
                break;

            default:
                if (status) {
                    updateData.status = status;
                }
        }

        const { error: updateError } = await supabase
            .from('calls')
            .update(updateData)
            .eq('id', existingCall.id);

        if (updateError) {
            console.error("Error updating call status:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
