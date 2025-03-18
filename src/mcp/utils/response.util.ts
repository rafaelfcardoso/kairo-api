import { Request } from 'express';
import {
  ApiResponse,
  CollectionResponse,
  ResponseMetadata,
  ResponseLinks,
  ResourceInstance,
  ResourceQueryParams,
  ErrorResponse,
  ApiError,
  ApiErrorCode,
} from '../mcp.types';

/**
 * Utility class for standardizing API responses in the MCP module
 */
export class ResponseUtil {
  private static readonly API_VERSION = '1.0';

  /**
   * Creates a standardized API response envelope for a single resource
   *
   * @param data The resource data
   * @param request The Express request object for generating links
   * @param included Optional included resources
   * @returns Standardized API response
   */
  static createResourceResponse<T>(
    data: T,
    request: Request,
    included?: ResourceInstance[],
  ): ApiResponse<T> {
    const baseUrl = this.getBaseUrl(request);

    return {
      data,
      meta: this.createMetadata(),
      links: {
        self: `${baseUrl}${request.originalUrl}`,
      },
      included,
    };
  }

  /**
   * Creates a standardized API response envelope for a collection of resources with pagination
   *
   * @param data Array of resources
   * @param request The Express request object for generating links
   * @param queryParams Query parameters for pagination info
   * @param totalCount Total count of resources (for pagination)
   * @param included Optional included resources
   * @returns Standardized collection response
   */
  static createCollectionResponse<T>(
    data: T[],
    request: Request,
    queryParams: ResourceQueryParams,
    totalCount: number,
    included?: ResourceInstance[],
  ): CollectionResponse<T> {
    const baseUrl = this.getBaseUrl(request);
    const page = queryParams.page || { number: 1, size: 20 };
    const pageNumber = page.number || 1;
    const pageSize = page.size || 20;

    // Calculate pagination values
    const count = data.length;
    const pageCount = Math.ceil(totalCount / pageSize);

    // Create pagination links
    const links = this.createPaginationLinks(
      baseUrl,
      request.path,
      queryParams,
      pageNumber,
      pageCount,
    );

    return {
      data,
      meta: {
        ...this.createMetadata(),
        count,
        totalCount,
        pageCount,
      },
      links,
      included,
    };
  }

  /**
   * Creates a standardized error response
   *
   * @param errors Array of API errors
   * @param request The Express request object
   * @returns Standardized error response
   */
  static createErrorResponse(
    errors: ApiError[],
    request: Request,
  ): ErrorResponse {
    return {
      errors,
      meta: this.createMetadata(),
    };
  }

  /**
   * Creates a single error object
   *
   * @param status HTTP status code
   * @param code Machine-readable error code
   * @param title Short error title
   * @param detail Detailed error message
   * @param source Optional source of the error (pointer or parameter)
   * @returns API error object
   */
  static createError(
    status: number,
    code: ApiErrorCode | string,
    title: string,
    detail: string,
    source?: { pointer?: string; parameter?: string },
  ): ApiError {
    return {
      status: status.toString(),
      code: code.toString(),
      title,
      detail,
      source,
    };
  }

  /**
   * Creates standard metadata for responses
   *
   * @returns Response metadata
   */
  private static createMetadata(): ResponseMetadata {
    return {
      apiVersion: this.API_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Creates pagination links for collection responses
   *
   * @param baseUrl Base URL of the API
   * @param path Request path
   * @param queryParams Original query parameters
   * @param currentPage Current page number
   * @param pageCount Total number of pages
   * @returns Links object with pagination URLs
   */
  private static createPaginationLinks(
    baseUrl: string,
    path: string,
    queryParams: ResourceQueryParams,
    currentPage: number,
    pageCount: number,
  ): ResponseLinks {
    const pageSize = queryParams.page?.size || 20;
    const createUrl = (page: number) => {
      // Create a copy of the original query params
      const params = { ...queryParams };

      // Set page parameters
      params.page = {
        ...(params.page || {}),
        number: page,
        size: pageSize,
      };

      // Convert to query string
      const queryString = this.buildQueryString(params);
      return `${baseUrl}${path}${queryString}`;
    };

    const links: ResponseLinks = {
      self: createUrl(currentPage),
      first: createUrl(1),
      last: pageCount > 0 ? createUrl(pageCount) : createUrl(1),
    };

    // Add prev/next links if applicable
    if (currentPage > 1) {
      links.prev = createUrl(currentPage - 1);
    }

    if (currentPage < pageCount) {
      links.next = createUrl(currentPage + 1);
    }

    return links;
  }

  /**
   * Builds a query string from ResourceQueryParams
   *
   * @param params Query parameters
   * @returns Formatted query string
   */
  private static buildQueryString(params: ResourceQueryParams): string {
    const queryParts: string[] = [];

    // Add filter parameters
    if (params.filter && Object.keys(params.filter).length > 0) {
      Object.entries(params.filter).forEach(([key, value]) => {
        queryParts.push(
          `filter[${encodeURIComponent(key)}]=${encodeURIComponent(String(value))}`,
        );
      });
    }

    // Add include parameter
    if (params.include && params.include.length > 0) {
      queryParts.push(
        `include=${params.include.map(encodeURIComponent).join(',')}`,
      );
    }

    // Add sort parameter
    if (params.sort && params.sort.length > 0) {
      queryParts.push(`sort=${params.sort.map(encodeURIComponent).join(',')}`);
    }

    // Add pagination parameters
    if (params.page) {
      if (params.page.number !== undefined) {
        queryParts.push(`page[number]=${params.page.number}`);
      }

      if (params.page.size !== undefined) {
        queryParts.push(`page[size]=${params.page.size}`);
      }
    }

    return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  }

  /**
   * Gets the base URL from the request
   *
   * @param request Express request object
   * @returns Base URL including protocol and host
   */
  private static getBaseUrl(request: Request): string {
    const protocol = request.protocol;
    const host = request.get('host');
    return `${protocol}://${host}`;
  }
}
