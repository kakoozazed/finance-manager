// lib/services/payment.service.ts
import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import crypto from 'crypto';

interface PaymentRequest {
  amount: number;
  account: string; // Phone number or bank account
  accountProviderCode?: 'MTN' | 'AIRTEL'; // For mobile money
  narrative: string;
  externalReference: string;
  sourceType: 'SUPPLIER_PAYMENT' | 'EXPENSE' | 'SALARY' | 'ADVANCE_ISSUE';
  sourceId: string;
  sessionId: string;
  description?: string;
}

interface BankAccountRequest {
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  currency?: string;
}

class PaymentService {
  private apiUrl = 'https://paymentsapi1.yo.co.ug/ybs/task.php';
  private apiUsername = '100251965443';
  private apiPassword = 'kyg6-BnDw-QgsA-RxTp-KQPP-AdFR-DZCs-RdRY';
  
  private generateSignature(xmlBody: string): string {
    // Create authentication signature (adjust based on Yo! API requirements)
    const signatureString = `${this.apiUsername}${this.apiPassword}${xmlBody}`;
    return crypto.createHash('sha256').update(signatureString).digest('base64');
  }

  private async makeRequest(xmlBody: string): Promise<any> {
    const signature = this.generateSignature(xmlBody);
    
    // Replace placeholder with actual signature
    const finalXml = xmlBody.replace('YOUR_BASE64_SIGNATURE', signature);
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Transfer-Encoding': 'text',
      },
      body: finalXml,
    });
    
    const responseText = await response.text();
    return this.parseXmlResponse(responseText);
  }

  private parseXmlResponse(xml: string): any {
    // Simple XML parsing (you might want to use xml2js library)
    // For now, return the raw response
    return { success: true, raw: xml };
  }

  async withdrawToMobileMoney(
    phoneNumber: string,
    amount: number,
    narrative: string,
    externalReference: string
  ): Promise<any> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${this.apiUsername}</APIUsername>
    <APIPassword>${this.apiPassword}</APIPassword>
    <Method>acwithdrawfunds</Method>
    <Amount>${amount}</Amount>
    <Account>${phoneNumber}</Account>
    <AccountProviderCode>MTN</AccountProviderCode>
    <Narrative>${narrative}</Narrative>
    <ExternalReference>${externalReference}</ExternalReference>
    <AuthenticationSignatureBase64>YOUR_BASE64_SIGNATURE</AuthenticationSignatureBase64>
  </Request>
</AutoCreate>`;
    
    return this.makeRequest(xml);
  }

  async createVerifiedBankAccount(
    bankName: string,
    bankAccountNumber: string,
    accountName: string,
    currency: string = 'UGX'
  ): Promise<any> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${this.apiUsername}</APIUsername>
    <APIPassword>${this.apiPassword}</APIPassword>
    <Method>accreateverifiedbankaccount</Method>
    <BankName>${bankName}</BankName>
    <BankAccountNumber>${bankAccountNumber}</BankAccountNumber>
    <AccountName>${accountName}</AccountName>
    <Currency>${currency}</Currency>
  </Request>
</AutoCreate>`;
    
    return this.makeRequest(xml);
  }

  async processPayment(
    payment: PaymentRequest,
    isServerAction: boolean = true
  ): Promise<{ success: boolean; message: string; paymentResult?: any }> {
    try {
      // Determine if it's mobile money or bank transfer
      const isMobileMoney = payment.accountProviderCode === 'MTN' || payment.accountProviderCode === 'AIRTEL';
      
      let paymentResult;
      if (isMobileMoney) {
        paymentResult = await this.withdrawToMobileMoney(
          payment.account,
          payment.amount,
          payment.narrative,
          payment.externalReference
        );
      } else {
        // For bank transfers, you might need a different method
        // You would first create/verify the bank account then transfer
        throw new Error('Bank transfer method not implemented yet');
      }
      
      // Record cash movement if payment was successful
      if (paymentResult.success !== false) {
        await this.recordCashMovement(payment, isServerAction);
      }
      
      return {
        success: true,
        message: 'Payment processed successfully',
        paymentResult,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  private async recordCashMovement(
    payment: PaymentRequest,
    isServerAction: boolean = true
  ): Promise<void> {
    try {
      let supabase;
      if (isServerAction) {
        supabase = await createClient();
      } else {
        supabase = createBrowserClient();
      }
      
      const { error } = await supabase
        .from('cash_movements')
        .insert({
          session_id: payment.sessionId,
          source_type: payment.sourceType,
          source_id: payment.sourceId,
          direction: 'OUT', // Payment is always OUT
          amount_ugx: payment.amount,
          description: payment.description || payment.narrative,
          occurred_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Error recording cash movement:', error);
        throw new Error('Failed to record cash movement');
      }
    } catch (error) {
      console.error('Cash movement recording error:', error);
      throw error;
    }
  }

  async processAdvanceIssue(
    advanceData: PaymentRequest,
    isServerAction: boolean = true
  ): Promise<{ success: boolean; message: string; paymentResult?: any }> {
    // Similar to processPayment but for advances
    return this.processPayment(advanceData, isServerAction);
  }
}

export const paymentService = new PaymentService();