import cron from 'node-cron';
import { DateTime } from 'luxon';
import { getDb } from '../db/database';
import { ScheduleConfig } from '../types';
import { PipelineService } from './pipelineService';

let cronTask: cron.ScheduledTask | null = null;

export class SchedulerService {
  /**
   * Initialize scheduler with current DB schedule config
   */
  static async initScheduler() {
    const db = await getDb();
    const configRow = await db.get(`SELECT * FROM schedule_config WHERE id = 'default-config'`);

    if (!configRow || !configRow.enabled) {
      console.log('[Scheduler] Scheduler disabled or unconfigured.');
      return;
    }

    const config: ScheduleConfig = {
      ...configRow,
      enabled: Boolean(configRow.enabled)
    };

    this.scheduleDubaiWindow(config);
  }

  /**
   * Configure node-cron job to run every hour between 5:00 AM and 8:00 AM Dubai Time (Asia/Dubai)
   */
  static scheduleDubaiWindow(config: ScheduleConfig) {
    if (cronTask) {
      cronTask.stop();
      cronTask = null;
    }

    if (!config.enabled) {
      console.log('[Scheduler] Auto-run cron stopped.');
      return;
    }

    // Cron expression: At minute 0 past every hour from 5 through 8 (5:00, 6:00, 7:00, 8:00 AM GST)
    // node-cron options allow timezone specification
    const cronExpr = '0 5-8 * * *';

    console.log(`[Scheduler] Setting up cron job for ${config.timezone} (${config.windowStart} - ${config.windowEnd}): ${cronExpr}`);

    cronTask = cron.schedule(
      cronExpr,
      async () => {
        const nowDubai = DateTime.now().setZone(config.timezone);
        console.log(`[Scheduler Trigger] Current Dubai Time: ${nowDubai.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')}`);

        try {
          await PipelineService.runPipeline('scheduler');
          const db = await getDb();
          await db.run(
            `UPDATE schedule_config SET lastRunAt = ? WHERE id = 'default-config'`,
            [new Date().toISOString()]
          );
        } catch (err) {
          console.error('[Scheduler Error]:', err);
        }
      },
      {
        timezone: config.timezone
      }
    );
  }

  /**
   * Get current scheduler status & next run estimation in Dubai time
   */
  static async getScheduleStatus(): Promise<ScheduleConfig> {
    const db = await getDb();
    const configRow = await db.get(`SELECT * FROM schedule_config WHERE id = 'default-config'`);
    
    const config: ScheduleConfig = {
      ...configRow,
      enabled: Boolean(configRow?.enabled ?? 1)
    };

    const nowDubai = DateTime.now().setZone(config.timezone);
    const windowStartHour = parseInt(config.windowStart.split(':')[0], 10) || 5;

    let nextRun = nowDubai.set({ hour: windowStartHour, minute: 0, second: 0, millisecond: 0 });
    if (nowDubai > nextRun) {
      nextRun = nextRun.plus({ days: 1 });
    }

    return {
      ...config,
      nextRunAt: nextRun.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')
    };
  }

  /**
   * Update schedule config settings
   */
  static async updateScheduleConfig(updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const db = await getDb();
    const current = await this.getScheduleStatus();

    const updated: ScheduleConfig = {
      ...current,
      ...updates
    };

    await db.run(
      `UPDATE schedule_config SET timezone = ?, windowStart = ?, windowEnd = ?, enabled = ? WHERE id = 'default-config'`,
      [updated.timezone, updated.windowStart, updated.windowEnd, updated.enabled ? 1 : 0]
    );

    this.scheduleDubaiWindow(updated);
    return updated;
  }
}
