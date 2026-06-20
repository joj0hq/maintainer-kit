export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class UnsupportedEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedEventError";
  }
}

