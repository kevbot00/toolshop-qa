// Defaults match the docker-compose ports; override to point the suite at another environment.
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4200';
export const API_URL = process.env.API_URL ?? 'http://localhost:8091';
