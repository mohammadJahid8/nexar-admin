/**
 * Wraps an asynchronous function to catch any errors and pass them to the Express error handling middleware.
 * @param {Function} fn - The asynchronous function to be wrapped.
 * @returns {Function} An asynchronous function that catches errors and passes them to the next middleware.
 */

const catchAsync = fn => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error('From catch async', error);
      next(error);
    }
  };
};

export default catchAsync;
