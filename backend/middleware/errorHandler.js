

import httpStatus from 'http-status';
/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = httpStatus.BAD_REQUEST;
    message = err.message;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Invalid ID format';
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    statusCode = httpStatus.CONFLICT;
    message = 'Duplicate entry exists';
  }

  // Handle Stripe errors
  if (err.type === 'StripeInvalidRequestError') {
    statusCode = httpStatus.BAD_REQUEST;
    message = err.message;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
