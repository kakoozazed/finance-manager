// app/api/payments/process/route.ts
import { createClient } from '@/lib/supabase/server';
import { paymentService } from '@/lib/services/payment.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      amount,
      account,
      accountProviderCode,
      narrative,
      externalReference,
      sourceType,
      sourceId,
      sessionId,
      description,
    } = body;
    
    // Validate required fields
    if (!amount || !account || !narrative || !sourceType || !sourceId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Process payment
    const result = await paymentService.processPayment({
      amount,
      account,
      accountProviderCode,
      narrative,
      externalReference,
      sourceType,
      sourceId,
      sessionId,
      description,
    }, true);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}