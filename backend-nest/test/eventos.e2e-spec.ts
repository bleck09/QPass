import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Humo mínimo: la lista pública de eventos responde 200 y un array.
 * Requiere la base de datos levantada y migrada (docker compose up -d,
 * npx prisma migrate deploy).
 */
describe('EventosController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /eventos -> 200 y array', async () => {
    const res = await request(app.getHttpServer()).get('/eventos').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /eventos/no-existe -> 404 con { error }', async () => {
    const res = await request(app.getHttpServer())
      .get('/eventos/no-existe')
      .expect(404);
    expect(res.body).toHaveProperty('error');
  });
});
