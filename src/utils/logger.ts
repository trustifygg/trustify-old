import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
  ],
});

export const Logger = {
  info: (message: string) => logger.info(message),
  error: (message: string) => logger.error(message),
  warn: (message: string) => logger.warn(message),
  debug: (message: string) => logger.debug(message),
}; 