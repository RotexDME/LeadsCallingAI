import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const phoneNumber = searchParams.get('phoneNumber');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = supabase
            .from('calls')
            .select('*, contacts(name, email)', { count: 'exact' })
            .order('started_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        if (phoneNumber) {
            query = query.eq('phone_number', phoneNumber);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching calls:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            calls: data,
            total: count,
            limit,
            offset
        });

    } catch (error: any) {
        console.error("Error in calls API:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
