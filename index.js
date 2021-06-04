const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const dayjs = require('dayjs')
const { v4: uuidv4 } = require('uuid');

function setup(opts) {
  const defaultLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5
  }
  const levels = opts.levels || defaultLevels
  const logLevel = opts.level || 'debug'
  const appName = opts.name || 'app'
  const awsAccessKeyId = opts.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
  const awsSecretKey = opts.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  const awsRegion = opts.AWS_REGION || process.env.AWS_REGION

  const simpleConsoleFormat = winston.format.printf(({ level, message }) => {
    if (typeof message === 'object') {
      if (message instanceof Error)
        message = {
          message: message.message,
          stack: message.stack
        }
      message = JSON.stringify(message)
    }
    return `${level}: ${message}`;
  });

  const consoleTransport = new winston.transports.Console({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      simpleConsoleFormat
    )
  });

  const cloudTransport = new WinstonCloudWatch({
    level: logLevel,
    levels,
    logGroupName: appName,
    logStreamName: uuidv4(),
    jsonMessage: true,
    awsAccessKeyId,
    awsSecretKey,
    awsRegion
  })

  const logger = winston.createLogger({
    level: logLevel,
    levels
  });

  logger
    .add(consoleTransport)

  if (process.env.NODE_ENV == 'production') {
    logger
      .clear()
      .add(cloudTransport)
  }

  const log = {}

  log.logger = logger

  log.levels = levels

  log.setLevel = level => {
    for (let idx = 0; idx < logger.transports.length; idx++) {
      logger.transports[idx].level = level
    }
  }

  Object.keys(levels).map(level => {
    log[level] = function(message) {
      logger.log({ level, message })
    }
  })

  return log
}

module.exports = setup
