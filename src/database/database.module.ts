import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool } from 'mysql2/promise';
import { MYSQL_POOL } from './database.constants';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: MYSQL_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createPool({
          host: config.get<string>('DB_HOST'),
          port: Number(config.get('DB_PORT') ?? 3306),
          user: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          connectionLimit: Number(config.get('DB_POOL_LIMIT') ?? 10),
          waitForConnections: true,
          queueLimit: 0,
          namedPlaceholders: true,
        }),
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
