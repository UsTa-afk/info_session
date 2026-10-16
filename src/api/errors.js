/** API hata sınıfları — client.js ve mockServer.js paylaşır. */

/** Ağ yok / sunucuya ulaşılamadı. */
export class NetworkError extends Error {}

/**
 * Sunucunun döndüğü hata (API_CONTRACT.md "Hata formatı").
 * status: HTTP kodu, code: makine okur kodu, details: ek bilgi (ör. {participantId}).
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}
