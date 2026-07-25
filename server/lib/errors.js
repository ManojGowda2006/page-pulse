class AuditError extends Error {
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class InvalidUrlError extends AuditError {
  constructor(message) {
    super(message, 400);
  }
}

class FetchTimeoutError extends AuditError {
  constructor(message) {
    super(message, 504);
  }
}

class NonHtmlResponseError extends AuditError {
  constructor(message) {
    super(message, 422);
  }
}

class UnreachableHostError extends AuditError {
  constructor(message) {
    super(message, 502);
  }
}

module.exports = {
  AuditError,
  InvalidUrlError,
  FetchTimeoutError,
  NonHtmlResponseError,
  UnreachableHostError,
};
