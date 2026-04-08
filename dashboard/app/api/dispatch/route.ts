import { NextResponse } from 'next/server';
import { sipClient, roomService } from '@/lib/server-utils';
import { supabase, Contact, Call } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phoneNumber, prompt, modelProvider, voice, contactName, contactEmail, metadata: customMetadata } = body;

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const trunkId = process.env.VOBIZ_SIP_TRUNK_ID;
        if (!trunkId) {
            console.error("VOBIZ_SIP_TRUNK_ID is missing in env");
            return NextResponse.json({ error: "SIP Trunk not configured" }, { status: 500 });
        }

        // Step 1: Create or update contact
        let contactId: string | null = null;
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('phone_number', phoneNumber)
            .maybeSingle();

        if (existingContact) {
            contactId = existingContact.id;
            // Update contact if name or email provided
            if (contactName || contactEmail) {
                await supabase
                    .from('contacts')
                    .update({
                        name: contactName || undefined,
                        email: contactEmail || undefined,
                    })
                    .eq('id', contactId);
            }
        } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                    phone_number: phoneNumber,
                    name: contactName || null,
                    email: contactEmail || null,
                    metadata: customMetadata || {}
                })
                .select('id')
                .single();

            if (contactError) {
                console.error("Error creating contact:", contactError);
            } else {
                contactId = newContact?.id || null;
            }
        }

        // Step 2: Generate unique room name
        const roomName = `call-${phoneNumber.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;
        const participantIdentity = `sip_${phoneNumber}`;

        console.log(`Dispatching call to ${phoneNumber} in room ${roomName} via trunk ${trunkId}`);

        // Step 3: Create call record in database
        const callData: Call = {
            contact_id: contactId,
            phone_number: phoneNumber,
            room_name: roomName,
            status: 'initiated',
            direction: 'outbound',
            prompt: prompt || null,
            model_provider: modelProvider || 'openai',
            voice_id: voice || 'alloy',
            metadata: customMetadata || {},
            started_at: new Date().toISOString()
        };

        const { data: callRecord, error: callError } = await supabase
            .from('calls')
            .insert(callData)
            .select('id')
            .single();

        if (callError) {
            console.error("Error creating call record:", callError);
        }

        // Step 4: Prepare metadata for LiveKit
        const livekitMetadata = JSON.stringify({
            phone_number: phoneNumber,
            user_prompt: prompt || "",
            model_provider: modelProvider || "openai",
            voice_id: voice || "alloy",
            call_id: callRecord?.id || null
        });

        // Step 5: Initiate SIP call
        try {
            const info = await sipClient.createSipParticipant(
                trunkId,
                phoneNumber,
                roomName,
                {
                    participantIdentity,
                    participantName: contactName || "Customer",
                    roomMetadata: livekitMetadata,
                }
            );

            // Update call record with SIP call ID
            if (callRecord?.id) {
                await supabase
                    .from('calls')
                    .update({
                        sip_call_id: info.sipCallId,
                        status: 'ringing'
                    })
                    .eq('id', callRecord.id);
            }

            return NextResponse.json({
                success: true,
                callId: callRecord?.id,
                roomName,
                sipCallId: info.sipCallId
            });

        } catch (sipError: any) {
            // Update call status to failed
            if (callRecord?.id) {
                await supabase
                    .from('calls')
                    .update({
                        status: 'failed',
                        error_message: sipError.message,
                        ended_at: new Date().toISOString()
                    })
                    .eq('id', callRecord.id);
            }
            throw sipError;
        }

    } catch (error: any) {
        console.error("Error dispatching call:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
