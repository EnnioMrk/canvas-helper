/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-private-class-members */
class Logger {
    static LEVELS = {
        DEBUG: { name: 'DEBUG', color: '#7F7F7F', prefix: '🔍' },
        INFO: { name: 'INFO', color: '#0077FF', prefix: 'ℹ️' },
        SUCCESS: { name: 'SUCCESS', color: '#00FF00', prefix: '✅' },
        WARN: { name: 'WARN', color: '#FFA500', prefix: '⚠️' },
        ERROR: { name: 'ERROR', color: '#FF0000', prefix: '❌' },
        GAME: { name: 'GAME', color: '#FF00FF', prefix: '🎮' },
    };

    static #instance;
    #enabled = true;
    #level = 'DEBUG';

    constructor() {
        if (Logger.#instance) {
            return Logger.#instance;
        }
        Logger.#instance = this;
    }

    static getInstance() {
        return new Logger();
    }

    enable() {
        this.#enabled = true;
    }

    disable() {
        this.#enabled = false;
    }

    setLevel(level) {
        this.#level = level;
    }

    #log(level, message, ...args) {
        if (!this.#enabled) return;

        const logLevel = Logger.LEVELS[level];
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

        console.log(
            `%c${logLevel.prefix} ${timestamp} [${logLevel.name}] ${message}`,
            `color: ${logLevel.color}; font-weight: bold`,
            ...args
        );
    }

    debug(message, ...args) {
        this.#log('DEBUG', message, ...args);
    }

    info(message, ...args) {
        this.#log('INFO', message, ...args);
    }

    success(message, ...args) {
        this.#log('SUCCESS', message, ...args);
    }

    warn(message, ...args) {
        this.#log('WARN', message, ...args);
    }

    error(message, ...args) {
        this.#log('ERROR', message, ...args);
    }

    game(message, ...args) {
        this.#log('GAME', message, ...args);
    }
    clear() {
        console.clear();
    }
}

const log = Logger.getInstance();
