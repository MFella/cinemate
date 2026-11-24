import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { resetDemoData } from './demo-reset';
import { DEMO_USER } from './demo-users';

export type DemoConfig = {
  enabled: boolean;
  resetIntervalMs: number;
  tokenSecret?: string;
};

/**
 * "Lazy" reset of the demo data: nobody schedules it, the first demo sign-in after
 * the interval (or after the data went missing) rebuilds it. The time of the last
 * reset is kept in memory, so each instance of the backend resets at most once per
 * interval and a restart resets again.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private readonly config: DemoConfig;
  private lastResetAt: number | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {
    this.config = configService.get<DemoConfig>('demo') ?? {
      enabled: false,
      resetIntervalMs: 0,
    };
  }

  get isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Makes sure the demo account has fresh data; concurrent calls share one reset. */
  ensureFresh(now = Date.now()): Promise<void> {
    this.inFlight ??= this.refreshIfNeeded(now).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refreshIfNeeded(now: number): Promise<void> {
    const isFresh =
      this.lastResetAt !== null &&
      now - this.lastResetAt < this.config.resetIntervalMs;
    if (isFresh && (await this.demoUserExists())) {
      return;
    }

    this.logger.log('Resetting the demo data');
    await resetDemoData(this.prismaService);
    this.lastResetAt = now;
  }

  private async demoUserExists(): Promise<boolean> {
    return !!(await this.prismaService.user.findFirst({
      where: { id: DEMO_USER.id },
      select: { id: true },
    }));
  }
}
