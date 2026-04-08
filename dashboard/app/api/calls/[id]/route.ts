import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const callId = params.id;

        const { data: call, error: callError } = await supabase
            .from('calls')
            .select('*, contacts(name, email, phone_number)')
            .eq('id', callId)
            .maybeSingle();

        if (callError) {
            console.error("Error fetching call:", callError);
            return NextResponse.json({ error: callError.message }, { status: 500 });
        }

        if (!call) {
            return NextResponse.json({ error: "Call not found" }, { status: 404 });
        }

        const { data: transcripts } = await supabase
            .from('call_transcripts')
            .select('*')
            .eq('call_id', callId)
            .order('sequence', { ascending: true });

        const { data: analytics } = await supabase
            .from('call_analytics')
            .select('*')
            .eq('call_id', callId)
            .maybeSingle();

        return NextResponse.json({
            success: true,
            call,
            transcripts: transcripts || [],
            analytics: analytics || null
        });

    } catch (error: any) {
        console.error("Error in call detail API:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
