import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { REQUEST_ID_HEADER } from '../constants/http.constants';
import { RequestWithId } from '../interfaces/http-request.interface';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const loggerWarnSpy = jest
    .spyOn(Logger.prototype, 'warn')
    .mockImplementation();
  const loggerErrorSpy = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation();

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    loggerWarnSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  it('returns the normalized error response with request id', () => {
    const filter = new HttpExceptionFilter();
    const request = {
      requestId: 'req-400',
      method: 'POST',
      url: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
      headers: {
        [REQUEST_ID_HEADER]: 'req-400',
      },
      ip: '127.0.0.1',
    } as unknown as RequestWithId;
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createArgumentsHost(request, response);
    const exception = new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: ['email must be an email'],
    });

    filter.catch(exception, host);

    expect(response.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      'req-400',
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
        path: '/api/v1/auth/login',
        requestId: 'req-400',
        error: {
          code: 'BAD_REQUEST',
          message: 'Bad Request',
          details: ['email must be an email'],
        },
      }),
    );
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('hides internal error messages from 500 responses', () => {
    const filter = new HttpExceptionFilter();
    const request = {
      requestId: 'req-500',
      method: 'GET',
      url: '/api/v1/health',
      originalUrl: '/api/v1/health',
      headers: {
        [REQUEST_ID_HEADER]: 'req-500',
      },
      ip: '127.0.0.1',
    } as unknown as RequestWithId;
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createArgumentsHost(request, response);

    filter.catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        requestId: 'req-500',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });
});

function createArgumentsHost(
  request: RequestWithId,
  response: Record<string, jest.Mock>,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: jest.fn(),
    }),
  } as unknown as ArgumentsHost;
}
