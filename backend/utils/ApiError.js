/**
 * Custom error class for API-related errors.
 * Extends the built-in Error class.
 * Includes properties for status code and message.
 */
class ApiError extends Error {
  statusCode;

  constructor(statusCode, message, stack = '') {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
