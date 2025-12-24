/**
 * Send a standardized JSON response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {number} options.statusCode - HTTP status code
 * @param {boolean} options.success - Whether the request was successful
 * @param {string} options.message - Response message
 * @param {*} [options.data] - Response data
 */
const sendResponse = (res, { statusCode, success, message, data }) => {
  const response = {
    success,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

export default sendResponse;
