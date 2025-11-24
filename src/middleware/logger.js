import morgan from 'morgan';

/**
 * Request Logger Middleware
 */
export const logger = () => {
  const format =
    process.env.NODE_ENV === 'production'
      ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms'
      : 'dev';

  return morgan(format);
};

/**
 * Custom Token for Morgan - User ID
 */
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

/**
 * API Request Logger with User ID
 */
export const apiLogger = morgan(':method :url :status :response-time ms - user::user-id', {
  skip: (req) => req.url.includes('/health'),
});

export default { logger, apiLogger };
