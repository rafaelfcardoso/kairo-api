import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure Swagger UI authentication works correctly.
 *
 * THIS IS THE COMPONENT THAT SOLVED THE SWAGGER UI AUTHENTICATION ISSUE.
 *
 * This middleware addresses a specific issue where Swagger UI doesn't always properly
 * pass authorization headers to API endpoints. It works by:
 *
 * 1. Detecting tokens from multiple sources (query params, cookies, headers)
 * 2. Caching tokens by IP address for subsequent requests
 * 3. Adding proper Authorization headers when they're missing
 *
 * The middleware is particularly important for authenticated endpoints accessed via
 * Swagger UI, but is unobtrusive for regular API calls.
 *
 * If authentication issues occur in Swagger UI, the /swagger-helper endpoint
 * provides a user-friendly interface for troubleshooting.
 */
@Injectable()
export class SwaggerAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SwaggerAuthMiddleware.name);
  private readonly apiTokenCache = new Map<string, string>();

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const requestPath = req.path;

      // Enhanced debug logging
      this.logger.debug(`Processing request to ${requestPath}`);
      this.logger.debug(`Query params: ${JSON.stringify(req.query)}`);
      this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);

      // Look for a token in multiple places
      let token = null;

      // 1. Check query parameters (token, access_token, auth, or bearer)
      token =
        (req.query.token as string) ||
        (req.query.access_token as string) ||
        (req.query.auth as string) ||
        (req.query.bearer as string);

      // 2. Check cookies if no token in query
      if (!token && req.cookies) {
        token =
          req.cookies.swagger_authorization ||
          req.cookies.token ||
          req.cookies.access_token;

        if (token) {
          this.logger.debug(
            `Found token in cookies: ${token.substring(0, 15)}...`,
          );
        }
      }

      // 3. Check authorization header if still no token
      if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization as string;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          this.logger.debug(
            `Found token in Authorization header: ${token.substring(0, 15)}...`,
          );
        }
      }

      // If we found a token anywhere, use it
      if (token) {
        // Cache the token by IP address
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        this.apiTokenCache.set(clientIp, token);
        this.logger.debug(
          `Cached token for ${clientIp}: ${token.substring(0, 15)}...`,
        );

        // Set the Authorization header if not already present
        if (!req.headers.authorization) {
          const formattedToken = token.startsWith('Bearer ')
            ? token
            : `Bearer ${token}`;
          req.headers.authorization = formattedToken;
          this.logger.debug(
            `Added Authorization header: ${formattedToken.substring(0, 20)}...`,
          );
        }
      }
      // If no token found in request but we have a cached one for this IP
      else if (req.path.startsWith('/api/v1/') && !req.headers.authorization) {
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const cachedToken = this.apiTokenCache.get(clientIp);

        if (cachedToken) {
          const formattedToken = cachedToken.startsWith('Bearer ')
            ? cachedToken
            : `Bearer ${cachedToken}`;

          req.headers.authorization = formattedToken;
          this.logger.debug(
            `Added cached Authorization header: ${formattedToken.substring(0, 20)}...`,
          );
        } else {
          this.logger.debug(`No token in cache for ${clientIp}`);
        }
      }

      // Log final authorization status
      if (req.headers.authorization) {
        this.logger.debug(
          `Request proceeding with Authorization header: ${req.headers.authorization.substring(0, 20)}...`,
        );
      } else {
        this.logger.debug('No Authorization header present for request');
      }

      next();
    } catch (error) {
      this.logger.error(`Error in SwaggerAuthMiddleware: ${error.message}`);
      this.logger.error(error.stack);
      next();
    }
  }
}
