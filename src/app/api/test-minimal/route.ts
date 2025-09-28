import { NextRequest, NextResponse } from 'next/server';

/**
 * Absolutely minimal endpoint to test if the delay is in Next.js itself
 */
export const POST = async (req: NextRequest) => {
    const start = Date.now();
    console.log(`[MINIMAL_TIMING] Request started at ${new Date().toISOString()}`);

    try {
        // Parse JSON like the bulk portfolio endpoint
        const parseStart = Date.now();
        const body = await req.json();
        const parseTime = Date.now() - parseStart;
        console.log(`[MINIMAL_TIMING] JSON parsed in ${parseTime}ms`);

        // Simulate some processing
        await new Promise(resolve => setTimeout(resolve, 10));

        // Create response
        const responseStart = Date.now();
        const response = NextResponse.json({
            message: 'Minimal test endpoint',
            receivedData: body,
            timestamp: new Date().toISOString()
        }, { status: 201 });
        const responseTime = Date.now() - responseStart;

        const totalTime = Date.now() - start;
        console.log(`[MINIMAL_TIMING] Total: ${totalTime}ms, Parse: ${parseTime}ms, Response: ${responseTime}ms`);

        response.headers.set('X-Minimal-Total', totalTime.toString());
        response.headers.set('X-Minimal-Parse', parseTime.toString());
        response.headers.set('X-Minimal-Response', responseTime.toString());

        console.log(`[MINIMAL_TIMING] Returning response at +${totalTime}ms`);
        return response;

    } catch (error: any) {
        const totalTime = Date.now() - start;
        console.log(`[MINIMAL_TIMING] Error after ${totalTime}ms: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
};

export const GET = async (req: NextRequest) => {
    const start = Date.now();
    console.log(`[MINIMAL_TIMING_GET] Request started at ${new Date().toISOString()}`);

    const response = NextResponse.json({
        message: 'Minimal GET endpoint',
        timestamp: new Date().toISOString()
    });

    const totalTime = Date.now() - start;
    console.log(`[MINIMAL_TIMING_GET] Completed in ${totalTime}ms`);

    response.headers.set('X-Minimal-Total', totalTime.toString());
    return response;
};