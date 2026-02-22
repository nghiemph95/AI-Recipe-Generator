export function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function errorResponse(res, error, statusCode = 500) {
  return res.status(statusCode).json({ success: false, error });
}
