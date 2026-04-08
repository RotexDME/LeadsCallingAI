import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = supabase
            .from('calls')
            .select('status, duration_seconds, model_provider, created_at');

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { data: calls, error } = await query;

        if (error) {
            console.error("Error fetching analytics:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const totalCalls = calls.length;
        const statusCounts = calls.reduce((acc: any, call) => {
            acc[call.status] = (acc[call.status] || 0) + 1;
            return acc;
        }, {});

        const completedCalls = calls.filter(c => c.status === 'completed');
        const avgDuration = completedCalls.length > 0
            ? completedCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / completedCalls.length
            : 0;

        const successRate = totalCalls > 0
            ? ((statusCounts.completed || 0) / totalCalls) * 100
            : 0;

        const providerCounts = calls.reduce((acc: any, call) => {
            acc[call.model_provider] = (acc[call.model_provider] || 0) + 1;
            return acc;
        }, {});

        return NextResponse.json({
            success: true,
            analytics: {
                totalCalls,
                statusCounts,
                avgDuration: Math.round(avgDuration),
                successRate: Math.round(successRate * 100) / 100,
                providerCounts,
                dateRange: {
                    start: startDate || 'all',
                    end: endDate || 'now'
                }
            }
        });

    } catch (error: any) {
        console.error("Error in analytics API:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
