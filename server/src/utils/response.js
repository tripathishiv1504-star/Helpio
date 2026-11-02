export function ok(res, data = null, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
  });
}

export function fail(res, status = 400, message = 'An error occurred') {
  return res.status(status).json({
    success: false,
    data: null,
    error: message,
  });
}
