// app/api/cash-movements/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const sourceType = searchParams.get('sourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let query = supabase
      .from('cash_movements')
      .select('*')
      .order('occurred_at', { ascending: false });
    
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    
    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }
    
    if (startDate) {
      query = query.gte('occurred_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('occurred_at', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching cash movements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      session_id,
      source_type,
      source_id,
      direction,
      amount_ugx,
      description,
      occurred_at,
    } = body;
    
    // Validate required fields
    if (!session_id || !source_type || !source_id || !direction || !amount_ugx) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate direction
    if (!['IN', 'OUT'].includes(direction)) {
      return NextResponse.json(
        { error: 'Direction must be IN or OUT' },
        { status: 400 }
      );
    }
    
    // Validate source_type
    const validSourceTypes = ['SUPPLIER_PAYMENT', 'EXPENSE', 'SALARY', 'ADVANCE_ISSUE'];
    if (!validSourceTypes.includes(source_type)) {
      return NextResponse.json(
        { error: 'Invalid source_type' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('cash_movements')
      .insert({
        session_id,
        source_type,
        source_id,
        direction,
        amount_ugx,
        description,
        occurred_at: occurred_at || new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating cash movement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}