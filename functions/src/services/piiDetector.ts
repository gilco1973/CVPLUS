import Anthropic from '@anthropic-ai/sdk';

export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  maskedData?: any;
  recommendations: string[];
}

export interface PIIMaskingOptions {
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskAddresses?: boolean;
  maskSSN?: boolean;
  maskCreditCards?: boolean;
  maskBankAccounts?: boolean;
  maskPassportNumbers?: boolean;
  maskDriversLicense?: boolean;
  keepFirstName?: boolean;
  keepLastName?: boolean;
  keepCity?: boolean;
  keepCountry?: boolean;
}

export class PIIDetector {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async detectAndMaskPII(
    cvData: any,
    options: PIIMaskingOptions = {}
  ): Promise<PIIDetectionResult> {
    const defaultOptions: PIIMaskingOptions = {
      maskEmails: false, // Keep email for contact
      maskPhones: false, // Keep phone for contact
      maskAddresses: true, // Mask full addresses
      maskSSN: true,
      maskCreditCards: true,
      maskBankAccounts: true,
      maskPassportNumbers: true,
      maskDriversLicense: true,
      keepFirstName: true,
      keepLastName: true,
      keepCity: true,
      keepCountry: true,
      ...options
    };

    const prompt = `Analyze this CV data for personally identifiable information (PII) and sensitive data.

IMPORTANT INSTRUCTIONS:
1. Use ONLY the provided CV data to identify PII - do not add or assume any information
2. DO NOT MAKE UP any PII that is not explicitly present in the data
3. Only detect and mask information that actually exists in the CV
4. Preserve all other information exactly as provided
    
CV Data:
${JSON.stringify(cvData, null, 2)}

Please:
1. Identify all PII and sensitive information
2. Create a masked version based on these rules:
   - ${defaultOptions.maskEmails ? 'MASK emails' : 'KEEP emails'}
   - ${defaultOptions.maskPhones ? 'MASK phone numbers' : 'KEEP phone numbers'}
   - ${defaultOptions.maskAddresses ? 'MASK street addresses (keep city/country if specified)' : 'KEEP addresses'}
   - ALWAYS mask: SSN, credit cards, bank accounts, passport numbers, driver's license numbers
   - ${defaultOptions.keepFirstName ? 'KEEP first name' : 'MASK first name'}
   - ${defaultOptions.keepLastName ? 'KEEP last name' : 'MASK last name'}
   - ${defaultOptions.keepCity ? 'KEEP city' : 'MASK city'}
   - ${defaultOptions.keepCountry ? 'KEEP country' : 'MASK country'}

Return a JSON response with:
{
  "hasPII": boolean,
  "detectedTypes": ["list of PII types found"],
  "maskedData": { the CV data with PII masked according to rules },
  "recommendations": ["list of privacy recommendations"]
}

For masking, use:
- Email: [EMAIL_MASKED]
- Phone: [PHONE_MASKED]
- Address: [ADDRESS_MASKED]
- SSN: [SSN_MASKED]
- Credit Card: [CC_MASKED]
- Bank Account: [BANK_MASKED]
- Passport: [PASSPORT_MASKED]
- Driver's License: [DL_MASKED]
- Other sensitive: [SENSITIVE_MASKED]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0,
        system: 'You are a privacy expert specializing in PII detection and data protection. You MUST only identify PII that actually exists in the provided data. Never add, assume, or make up any information. Your role is to accurately detect existing PII, not to enhance or add to the data.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      throw new Error('Failed to parse PII detection response');
    } catch (error) {
      console.error('Error detecting PII:', error);
      throw new Error(`Failed to detect PII: ${error}`);
    }
  }

  // Quick regex-based PII detection for immediate feedback
  quickDetectPII(text: string): {
    hasSSN: boolean;
    hasCreditCard: boolean;
    hasBankAccount: boolean;
    hasPassport: boolean;
  } {
    // SSN patterns (XXX-XX-XXXX or XXXXXXXXX)
    const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/;
    
    // Credit card patterns (basic check for 13-19 digits)
    const ccPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/;
    
    // Bank account patterns (IBAN or US account numbers)
    const bankPattern = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b|\b\d{8,17}\b/;
    
    // Passport pattern (various formats)
    const passportPattern = /\b[A-Z]{1,2}\d{6,9}\b/;

    return {
      hasSSN: ssnPattern.test(text),
      hasCreditCard: ccPattern.test(text),
      hasBankAccount: bankPattern.test(text),
      hasPassport: passportPattern.test(text)
    };
  }

  // Generate privacy-safe version of CV for public sharing
  async generatePrivacyVersion(cvData: any): Promise<any> {
    const privacyOptions: PIIMaskingOptions = {
      maskEmails: true,
      maskPhones: true,
      maskAddresses: true,
      maskSSN: true,
      maskCreditCards: true,
      maskBankAccounts: true,
      maskPassportNumbers: true,
      maskDriversLicense: true,
      keepFirstName: true,
      keepLastName: false, // Mask last name for privacy
      keepCity: true,
      keepCountry: true
    };

    const result = await this.detectAndMaskPII(cvData, privacyOptions);
    return result.maskedData;
  }
}