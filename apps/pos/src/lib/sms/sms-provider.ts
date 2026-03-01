/**
 * SMS Provider (Phase 4 - MVP Sprint 4)
 *
 * Abstraction layer for SMS providers (SMSAPI, Twilio, etc.)
 * This is a stub implementation for MVP. Full implementation in Sprint 4.
 */

export interface SMSMessage {
  to: string;          // Phone number
  message: string;     // SMS content
  from?: string;       // Sender name/number (optional)
}

export interface SMSProvider {
  send(message: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Mock SMS Provider for development
 * Logs SMS to console instead of sending
 */
class MockSMSProvider implements SMSProvider {
  async send(message: SMSMessage): Promise<{ success: boolean; messageId?: string }> {
    console.log('📱 [SMS Mock] Sending SMS:');
    console.log(`   To: ${message.to}`);
    console.log(`   From: ${message.from || 'MESOpos'}`);
    console.log(`   Message: ${message.message}`);

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

/**
 * SMSAPI Provider (Polish SMS service)
 * TODO: Implement in Sprint 4 with actual API integration
 */
class SMSAPIProvider implements SMSProvider {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async send(message: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement SMSAPI integration
    // https://www.smsapi.pl/docs
    throw new Error('SMSAPI provider not yet implemented (Sprint 4)');
  }
}

/**
 * Twilio Provider (International SMS service)
 * TODO: Implement in Sprint 4 with actual API integration
 */
class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
  }

  async send(message: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement Twilio integration
    // https://www.twilio.com/docs/sms
    throw new Error('Twilio provider not yet implemented (Sprint 4)');
  }
}

/**
 * Get SMS provider instance based on environment configuration
 */
export function getSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER || 'mock';

  switch (provider) {
    case 'smsapi':
      const smsapiToken = process.env.SMSAPI_TOKEN;
      if (!smsapiToken) {
        console.warn('SMSAPI_TOKEN not configured, falling back to mock provider');
        return new MockSMSProvider();
      }
      return new SMSAPIProvider(smsapiToken);

    case 'twilio':
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      if (!twilioSid || !twilioToken) {
        console.warn('Twilio credentials not configured, falling back to mock provider');
        return new MockSMSProvider();
      }
      return new TwilioProvider(twilioSid, twilioToken);

    case 'mock':
    default:
      return new MockSMSProvider();
  }
}

/**
 * Send SMS helper function
 */
export async function sendSMS(
  to: string,
  message: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = getSMSProvider();
  return provider.send({ to, message, from });
}
