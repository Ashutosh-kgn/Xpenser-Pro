import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

// Load local .env manually if process.env is empty (for local dev environments)
function loadLocalEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          if (key.trim() === 'RESEND_API_KEY' && value) {
            process.env.RESEND_API_KEY = value;
            console.log('[Serverless] Loaded RESEND_API_KEY from local .env file.');
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Serverless] Failed to load local .env file:', e);
  }
}


// Swappable Email Provider Interface
interface EmailAttachment {
  filename: string;
  content: string; // Base64 representation
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  attachment: EmailAttachment;
}

interface EmailProvider {
  sendEmail(params: EmailParams): Promise<{ messageId: string }>;
}

// 1. Resend Email Provider implementation
class ResendProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(params: EmailParams): Promise<{ messageId: string }> {
    console.log(`[ResendProvider] Dispatching email statement to ${params.to}...`);
    
    // Resend Sandbox constraints: must send from onboarding@resend.dev if domain not verified
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Xpenser Pro <onboarding@resend.dev>',
        to: [params.to],
        subject: params.subject,
        html: params.html,
        attachments: [
          {
            filename: params.attachment.filename,
            content: params.attachment.content
          }
        ]
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error(`[ResendProvider] Error response:`, data);
      throw new Error(data.message || `Resend API error status: ${response.status}`);
    }

    if (!data.id) {
      throw new Error('Resend did not return a valid Message ID.');
    }

    console.log(`[ResendProvider] Success. Message ID: ${data.id}`);
    return { messageId: data.id };
  }
}

// Helper to parse JSON request body on serverless Node
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, initialDelay = 1000): Promise<T> {
  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[RetryEngine] Attempt ${attempt} failed: ${String(err)}`);
      if (attempt === maxAttempts) {
        throw err;
      }
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`[RetryEngine] Waiting ${delay}ms before retrying...`);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
  throw new Error('Retry failed');
}

// Main Vercel serverless request handler
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Load local environment variables manually in development
  loadLocalEnv();

  // Enforce CORS and options requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const startTime = Date.now();
  console.log(`[Serverless] /api/send-statement request received.`);

  // 1. Env validation
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('[Serverless] Configuration error: RESEND_API_KEY environment variable missing.');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'RESEND_API_KEY missing' }));
    return;
  }

  try {
    // 2. Authorization Header Token Validation
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Serverless] Authentication failure: Missing or malformed authorization header.');
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized: Missing session token' }));
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token against Google Firebase Auth REST endpoints
    const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyCkhNp3d2HUDzo9Q5gTipdXWtt8q2bos-k`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!verifyResponse.ok) {
      console.warn('[Serverless] Token verification failed on Google servers.');
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid session token' }));
      return;
    }

    const verifyData = await verifyResponse.json() as any;
    const tokenUser = verifyData?.users?.[0];
    if (!tokenUser || !tokenUser.email) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized: User lookup failed' }));
      return;
    }

    const authenticatedUserEmail = tokenUser.email.toLowerCase();
    console.log(`[Serverless] Authorized session for user: ${authenticatedUserEmail}`);

    // 3. Body Parsing & Parameters Validation
    const body = await parseBody(req);
    const { to, subject, html, pdfBase64, filename } = body;

    if (!to || !subject || !html || !pdfBase64 || !filename) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Bad Request: Missing parameters' }));
      return;
    }

    // Authorization owner-check: recipient email must match authenticated user email
    if (to.toLowerCase() !== authenticatedUserEmail) {
      console.warn(`[Serverless] Security block: User ${authenticatedUserEmail} attempted to send statement to unauthorized recipient ${to}`);
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: You can only email your own financial statements.' }));
      return;
    }

    // 4. Binary PDF Magic byte verification
    const decodedPrefix = Buffer.from(pdfBase64.substring(0, 30), 'base64').toString('ascii');
    if (!decodedPrefix.startsWith('%PDF')) {
      console.error('[Serverless] Validation error: Attachment payload is not a valid PDF file.');
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Bad Request: Attachment payload signature check failed' }));
      return;
    }

    const binarySize = Buffer.from(pdfBase64, 'base64').length;
    console.log(`[Serverless] Validated PDF attachment: "${filename}" (${binarySize} bytes)`);

    if (binarySize > 4 * 1024 * 1024) { // 4MB
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Bad Request: PDF statement size exceeds 4MB limit' }));
      return;
    }

    // 5. Instantiating Modular Provider
    const emailService: EmailProvider = new ResendProvider(resendApiKey);

    // Send with Retry logic
    const { messageId } = await retryWithBackoff(() => 
      emailService.sendEmail({
        to,
        subject,
        html,
        attachment: {
          filename,
          content: pdfBase64
        }
      })
    );

    const timeTaken = Date.now() - startTime;
    console.log(`[Monitoring] Delivery success. Recipient: ${to}, Attachment: ${binarySize} bytes, Time: ${timeTaken}ms, ID: ${messageId}`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      success: true, 
      messageId, 
      provider: 'Resend', 
      recipient: to, 
      sizeBytes: binarySize, 
      timeMs: timeTaken 
    }));

  } catch (error: any) {
    console.error('[Serverless] Dispatch failed with exception:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }));
  }
}
