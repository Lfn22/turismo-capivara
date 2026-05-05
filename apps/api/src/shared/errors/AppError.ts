export class AppError extends Error {
  message: string
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.message = message
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}
