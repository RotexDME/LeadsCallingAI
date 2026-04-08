import { NextResponse } from 'next/server';
import { roomService, sipClient } from '@/lib/server-utils';
import { supabase, Call } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { numbers, prompt, modelProvider, voice } = body;

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return NextResponse.json({ error: "List of phone numbers is required" }, { status: 400 });
        }

        const trunkId = process.env.VOBIZ_SIP_TRUNK_ID;
        if (!trunkId) {
            return NextResponse.json({ error: "SIP Trunk not configured" }, { status: 500 });
        }

        const results = [];

        for (const phoneNumber of numbers) {
            try {
                // Create or get contact
                let contactId: string | null = null;
                const { data: existingContact } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('phone_number', phoneNumber)
                    .maybeSingle();

                if (existingContact) {
                    contactId = existingContact.id;
                } else {
                    const { data: newContact } = await supabase
                        .from('contacts')
                        .insert({ phone_number: phoneNumber })
                        .select('id')
                        .single();
                    contactId = newContact?.id || null;
                }

                const roomName = `call-${phoneNumber.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;
                const participantIdentity = `sip_${phoneNumber}`;

                // Create call record
                const callData: Call = {
                    contact_id: contactId,
                    phone_number: phoneNumber,
                    room_name: roomName,
                    status: 'initiated',
                    direction: 'outbound',
                    prompt: prompt || null,
                    model_provider: modelProvider || 'openai',
                    voice_id: voice || 'alloy',
                    started_at: new Date().toISOString()
                };

                const { data: callRecord } = await supabase
                    .from('calls')
                    .insert(callData)
                    .select('id')
                    .single();

                const metadata = JSON.stringify({
                    phone_number: phoneNumber,
                    user_prompt: prompt || "",
                    model_provider: modelProvider || "openai",
                    voice_id: voice || "alloy",
                    call_id: callRecord?.id || null
                });

                await roomService.createRoom({
                    name: roomName,
                    metadata: metadata,
                    emptyTimeout: 60 * 5,
                });

                const info = await sipClient.createSipParticipant(
                    trunkId,
                    phoneNumber,
                    roomName,
                    {
                        participantIdentity,
                        participantName: "Customer",
                    }
                );

                // Update with SIP call ID
                if (callRecord?.id) {
                    await supabase
                        .from('calls')
                        .update({
                            sip_call_id: info.sipCallId,
                            status: 'ringing'
                        })
                        .eq('id', callRecord.id);
                }

                results.push({
                    phoneNumber,
                    status: 'dispatched',
                    callId: callRecord?.id,
                    sipCallId: info.sipCallId
                });

                await new Promise(r => setTimeout(r, 200));

            } catch (e: any) {
                console.error(`Failed to dispatch ${phoneNumber}:`, e);
                results.push({ phoneNumber, status: 'failed', error: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${numbers.length} numbers`,
            results
        });

    } catch (error: any) {
        console.error("Queue error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
