import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AIScanResult } from '@/types/delivery';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCAN_PROMPT = `You are analyzing a delivery document (invoice or delivery note) for a restaurant/food service business.

Extract the following information from the image:
1. document_number - invoice or delivery note number (null if not found)
2. document_date - date on the document in YYYY-MM-DD format (null if not found)
3. supplier_name - name of the supplier/company (null if not found)
4. items - array of line items, each with:
   - name: product name as written on document
   - quantity: numeric quantity (null if unclear)
   - unit: unit of measurement like kg, szt, l, op (null if not shown)
   - unit_price_net: net price per unit in PLN (null if not shown, e.g. on delivery notes)
   - vat_rate: VAT rate as percentage string like "8%", "23%", "5%" (null if not shown)
   - expiry_date: expiry date in YYYY-MM-DD format (null if not shown)

Important:
- This is a Polish document. Prices are in PLN.
- Return ONLY valid JSON matching the schema below.
- If the document is not a delivery/invoice document, return empty items array.
- Do your best to extract quantities and prices even if formatting is unusual.

Return JSON schema:
{
  "document_number": string | null,
  "document_date": string | null,
  "supplier_name": string | null,
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price_net": number | null,
      "vat_rate": string | null,
      "expiry_date": string | null
    }
  ]
}`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: { code: 'CONFIG_ERROR', message: 'OpenAI API key not configured' } },
      { status: 500 }
    );
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_IMAGE', message: 'No image provided' } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    imageBase64 = buffer.toString('base64');
    mimeType = file.type || 'image/jpeg';
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Could not read image from request' } },
      { status: 400 }
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SCAN_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: { code: 'AI_ERROR', message: 'No response from AI' } },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const scanResult: AIScanResult = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, data: scanResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'AI_SCAN_FAILED', message } },
      { status: 500 }
    );
  }
}
