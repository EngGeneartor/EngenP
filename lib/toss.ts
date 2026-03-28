/**
 * lib/toss.ts
 *
 * Toss Payments API helper.
 * All server-side calls to the Toss Payments REST API go through here.
 */

const TOSS_BASE_URL = 'https://api.tosspayments.com'

function getSecretKey(): string {
  const key = process.env.TOSS_PAYMENTS_SECRET_KEY
  if (!key) throw new Error('TOSS_PAYMENTS_SECRET_KEY is not configured')
  return key
}

function authHeader(): string {
  // Toss uses Basic auth: Base64(secretKey + ":")
  const encoded = Buffer.from(getSecretKey() + ':').toString('base64')
  return `Basic ${encoded}`
}

// ---------------------------------------------------------------------------
// Payment confirmation (one-time or first billing)
// ---------------------------------------------------------------------------

export interface ConfirmPaymentParams {
  paymentKey: string
  orderId: string
  amount: number
}

export async function confirmPayment(params: ConfirmPaymentParams) {
  const res = await fetch(`${TOSS_BASE_URL}/v1/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new TossApiError(data.code ?? 'UNKNOWN', data.message ?? 'Payment confirmation failed', res.status)
  }
  return data
}

// ---------------------------------------------------------------------------
// Billing key (자동결제 카드 등록)
// ---------------------------------------------------------------------------

export interface IssueBillingKeyParams {
  authKey: string
  customerKey: string
}

export async function issueBillingKey(params: IssueBillingKeyParams) {
  const res = await fetch(`${TOSS_BASE_URL}/v1/billing/authorizations/card`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new TossApiError(data.code ?? 'UNKNOWN', data.message ?? 'Billing key issuance failed', res.status)
  }
  return data
}

// ---------------------------------------------------------------------------
// Billing charge (자동결제 승인)
// ---------------------------------------------------------------------------

export interface BillingChargeParams {
  billingKey: string
  customerKey: string
  amount: number
  orderId: string
  orderName: string
  customerEmail?: string
}

export async function chargeBilling(params: BillingChargeParams) {
  const { billingKey, ...body } = params
  const res = await fetch(`${TOSS_BASE_URL}/v1/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new TossApiError(data.code ?? 'UNKNOWN', data.message ?? 'Billing charge failed', res.status)
  }
  return data
}

// ---------------------------------------------------------------------------
// Payment inquiry
// ---------------------------------------------------------------------------

export async function getPayment(paymentKey: string) {
  const res = await fetch(`${TOSS_BASE_URL}/v1/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader(),
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new TossApiError(data.code ?? 'UNKNOWN', data.message ?? 'Payment inquiry failed', res.status)
  }
  return data
}

// ---------------------------------------------------------------------------
// Payment cancellation
// ---------------------------------------------------------------------------

export interface CancelPaymentParams {
  paymentKey: string
  cancelReason: string
}

export async function cancelPayment(params: CancelPaymentParams) {
  const res = await fetch(`${TOSS_BASE_URL}/v1/payments/${params.paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason: params.cancelReason }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new TossApiError(data.code ?? 'UNKNOWN', data.message ?? 'Payment cancellation failed', res.status)
  }
  return data
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class TossApiError extends Error {
  code: string
  statusCode: number

  constructor(code: string, message: string, statusCode: number) {
    super(message)
    this.name = 'TossApiError'
    this.code = code
    this.statusCode = statusCode
  }
}
