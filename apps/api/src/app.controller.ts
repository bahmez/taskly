/**
 * Global application controller providing health check endpoint.
 * 
 * This controller handles basic server health checks and is publicly accessible
 * without authentication. Useful for load balancers and monitoring services.
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

/**
 * Global application controller.
 * Serves root-level endpoints like health checks.
 */
@ApiTags('health')
@Controller()
export class AppController {
  /**
   * Health check endpoint.
   * Returns a simple success response to indicate API is running.
   * 
   * Public endpoint - no authentication required.
   * Used by load balancers and monitoring systems.
   * 
   * @returns Object with ok status
   */
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  @Get('/health')
  health() {
    return { ok: true };
  }
}


