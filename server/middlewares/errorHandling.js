export default (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  console.error(`[Error] ${status}: ${message}`);
  res.status(status).json({ message });
};
