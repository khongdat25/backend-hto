import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { API_PREFIX, API_VERSION } from '../src/common/constants/app.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { ApiResponse } from '../src/common/interfaces/api-response.interface';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { DatabaseService } from '../src/database/database.service';

type RootInfo = {
  name: string;
  status: string;
  apiVersion: string;
  author: string;
};

type HealthInfo = {
  status: string;
  database: string;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const databaseServiceMock = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    getDb: jest.fn(() => ({
      command: jest.fn().mockResolvedValue({ ok: 1 }),
    })),
    collection: jest.fn(() => ({
      createIndex: jest.fn().mockResolvedValue('index'),
    })),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(databaseServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`${API_PREFIX}/${API_VERSION}`, {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });
    app.use(requestIdMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ApiResponse<RootInfo>;

        expect(body.requestId).toEqual(expect.any(String));
        expect(body).toMatchObject({
          success: true,
          data: {
            name: 'backend-hto',
            status: 'running',
            apiVersion: API_VERSION,
            author: 'DucToanDev',
          },
          path: '/',
        });
      });
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/${API_VERSION}/health`)
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown as ApiResponse<HealthInfo>;

        expect(body.requestId).toEqual(expect.any(String));
        expect(body).toMatchObject({
          success: true,
          data: {
            status: 'ok',
            database: 'connected',
          },
          path: `/${API_PREFIX}/${API_VERSION}/health`,
        });
      });
  });
});
