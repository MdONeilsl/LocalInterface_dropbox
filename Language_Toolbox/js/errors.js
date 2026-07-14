export class AppError extends Error {
    constructor(message, code = 'APP_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
    }
}

export class ValidationError extends AppError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR');
    }
}

export class NetworkError extends AppError {
    constructor(message) {
        super(message, 'NETWORK_ERROR');
    }
}

export class ApiError extends AppError {
    constructor(message, status) {
        super(message, 'API_ERROR');
        this.status = status;
    }
}

export class ConfigurationError extends AppError {
    constructor(message) {
        super(message, 'CONFIG_ERROR');
    }
}