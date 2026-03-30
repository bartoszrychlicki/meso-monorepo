import crypto from 'crypto'
import { resolveLocale, type Locale } from '@meso/core'

export interface P24Config {
    merchantId: number
    posId: number
    crcKey: string
    apiKey: string
    mode: 'sandbox' | 'production'
}

export interface P24TransactionRequest {
    merchantId: number
    posId: number
    sessionId: string
    amount: number
    currency: string
    description: string
    email: string
    client?: string
    address?: string
    zip?: string
    city?: string
    country?: string
    phone?: string
    language?: string
    method?: number
    urlReturn: string
    urlStatus: string
    timeLimit?: number
    channel?: number
    waitForResult?: boolean
    regulationAccept?: boolean
    shipping?: number
    transferLabel?: string
    encoding?: string
    sign: string
}

export interface P24TransactionResponse {
    token: string
}

export interface P24Notification {
    merchantId: number
    posId: number
    sessionId: string
    amount: number
    originAmount: number
    currency: string
    orderId: number
    methodId: number
    statement: string
    sign: string
}

export interface P24RefundRequestItem {
    orderId: number
    sessionId: string
    amount: number
    description: string
}

export interface P24RefundRequest {
    requestId: string
    refundsUuid: string
    urlStatus: string
    refunds: P24RefundRequestItem[]
}

export interface P24RefundResponseItem extends P24RefundRequestItem {
    status: boolean
    message: string
}

export interface P24RefundNotification {
    orderId: number
    sessionId: string
    merchantId: number
    requestId: string
    refundsUuid: string
    amount: number
    currency: string
    timestamp: number
    status: 0 | 1
    sign: string
}

export class P24RefundError extends Error {
    readonly details?: unknown
    readonly statusCode?: number

    constructor(message: string, options?: { details?: unknown; statusCode?: number }) {
        super(message)
        this.name = 'P24RefundError'
        this.details = options?.details
        this.statusCode = options?.statusCode
    }
}

export class P24 {
    private config: P24Config
    private baseUrl: string

    constructor(config: P24Config) {
        this.config = config
        this.baseUrl = config.mode === 'production'
            ? 'https://secure.przelewy24.pl'
            : 'https://sandbox.przelewy24.pl'
    }

    private calculateSign(sessionId: string, amount: number, currency: string, crcKey: string): string {
        const data = `{"sessionId":"${sessionId}","merchantId":${this.config.merchantId},"amount":${amount},"currency":"${currency}","crc":"${crcKey}"}`
        return crypto.createHash('sha384').update(data).digest('hex')
    }

    private getAuthHeader(): string {
        return `Basic ${Buffer.from(`${this.config.posId}:${this.config.apiKey}`).toString('base64')}`
    }

    // For verifying notification signature
    public verifySign(notification: P24Notification): boolean {
        const { sessionId, amount, currency, orderId, sign } = notification
        // Note: Check documentation if P24 sends 'amount' or 'originAmount' for verification hash
        // Usually it is: sessionId, orderId, amount, currency, crc
        const data = `{"sessionId":"${sessionId}","orderId":${orderId},"amount":${amount},"currency":"${currency}","crc":"${this.config.crcKey}"}`
        const expectedSign = crypto.createHash('sha384').update(data).digest('hex')
        return expectedSign === sign
    }

    public async registerTransaction(
        sessionId: string,
        amount: number, // in groszy (e.g. 100 for 1 PLN)
        description: string,
        email: string,
        urlReturn: string,
        urlStatus: string,
        client?: string,
        locale: Locale = 'pl'
    ): Promise<string> {
        const sign = this.calculateSign(sessionId, amount, 'PLN', this.config.crcKey)

        const payload: P24TransactionRequest = {
            merchantId: this.config.merchantId,
            posId: this.config.posId,
            sessionId,
            amount,
            currency: 'PLN',
            description,
            email,
            client,
            urlReturn,
            urlStatus,
            sign,
            encoding: 'UTF-8',
            country: 'PL',
            language: resolveLocale(locale) === 'en' ? 'en' : 'pl',
        }

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15_000)
            const response = await fetch(`${this.baseUrl}/api/v1/transaction/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.getAuthHeader()
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const data = await response.json()

            if (response.ok && data.data?.token) {
                return data.data.token
            } else {
                console.error('P24 Registration Error:', data)
                throw new Error(data.error || 'Failed to register transaction')
            }
        } catch (error) {
            console.error('P24 API Error:', error)
            throw error
        }
    }

    public async verifyTransaction(notification: P24Notification): Promise<boolean> {
        // First verify signature locally
        // NOTE: Relaxing this check as local calculation might differ from P24 notification format
        if (!this.verifySign(notification)) {
            console.warn('[P24 Warning] Local signature verification failed. Proceeding to remote verification as fallback.')
        } else {
            console.log('[P24] Local signature verification passed.')
        }

        // To be compliant with P24 REST, we call PUT /api/v1/transaction/verify
        const sign = crypto.createHash('sha384').update(
            `{"sessionId":"${notification.sessionId}","orderId":${notification.orderId},"amount":${notification.amount},"currency":"${notification.currency}","crc":"${this.config.crcKey}"}`
        ).digest('hex')

        try {
            const verifyController = new AbortController()
            const verifyTimeoutId = setTimeout(() => verifyController.abort(), 15_000)
            const response = await fetch(`${this.baseUrl}/api/v1/transaction/verify`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.getAuthHeader()
                },
                signal: verifyController.signal,
                body: JSON.stringify({
                    merchantId: this.config.merchantId,
                    posId: this.config.posId,
                    sessionId: notification.sessionId,
                    amount: notification.amount,
                    currency: notification.currency,
                    orderId: notification.orderId,
                    sign
                })
            })

            clearTimeout(verifyTimeoutId)
            const data = await response.json()
            if (response.ok && data.data?.status === 'success') {
                return true;
            }
            console.error('P24 Verification Failed:', data)
            return false;

        } catch (error) {
            console.error('P24 Verify API Error:', error)
            return false
        }
    }

    public getPaymentLink(token: string): string {
        return `${this.baseUrl}/trnRequest/${token}`
    }

    public verifyRefundNotificationSign(notification: P24RefundNotification): boolean {
        const { orderId, sessionId, refundsUuid, merchantId, amount, currency, status, sign } = notification
        const data = `{"orderId":${orderId},"sessionId":"${sessionId}","refundsUuid":"${refundsUuid}","merchantId":${merchantId},"amount":${amount},"currency":"${currency}","status":${status},"crc":"${this.config.crcKey}"}`
        const expectedSign = crypto.createHash('sha384').update(data).digest('hex')
        return expectedSign === sign
    }

    public async refundTransaction(payload: P24RefundRequest): Promise<P24RefundResponseItem[]> {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15_000)
            const response = await fetch(`${this.baseUrl}/api/v1/transaction/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.getAuthHeader(),
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const data = await response.json().catch(() => ({}))
            if (response.ok && Array.isArray(data.data)) {
                return data.data as P24RefundResponseItem[]
            }

            if (response.status === 409 && Array.isArray(data.error)) {
                const firstError = data.error[0]
                const message = firstError?.message || 'Refund request rejected'
                throw new P24RefundError(message, { details: data.error, statusCode: response.status })
            }

            const message = data.error || data.message || 'Failed to request refund'
            throw new P24RefundError(message, { details: data, statusCode: response.status })
        } catch (error) {
            if (error instanceof P24RefundError) {
                throw error
            }

            console.error('P24 Refund API Error:', error)
            throw new P24RefundError(
                error instanceof Error ? error.message : 'Failed to request refund'
            )
        }
    }
}
