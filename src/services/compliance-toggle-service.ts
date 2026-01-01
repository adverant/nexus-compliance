/**
 * Nexus Compliance Engine - Compliance Toggle Service
 * Manages master and module-level compliance toggles with audit trail
 */

import { v4 as uuidv4 } from 'uuid';
import {
  query,
  transaction,
  snakeToCamel,
  type DatabaseRow,
} from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import type {
  ComplianceConfig,
  ComplianceConfigAudit,
  ModuleConfigMap,
  ComplianceServiceContext,
  ToggleModuleRequest,
  ToggleMasterRequest,
} from '../types/index.js';

const logger = createLogger('compliance-toggle-service');

// Default module configuration
const DEFAULT_MODULE_CONFIG: ModuleConfigMap = {
  gdpr: {
    enabled: true,
    dataExport: true,
    dataErasure: true,
    consentManagement: true,
    dataPortability: true,
    rectification: true,
    restrictProcessing: true,
  },
  aiAct: {
    enabled: true,
    riskClassification: true,
    humanOversight: true,
    transparencyLogging: true,
    technicalDocumentation: true,
    friaAssessment: true,
  },
  nis2: {
    enabled: true,
    incidentReporting: true,
    securityMonitoring: true,
    supplyChainSecurity: true,
    businessContinuity: true,
  },
  iso27001: {
    enabled: true,
    controlAssessment: true,
    auditTrail: true,
    riskManagement: true,
    accessControl: true,
  },
  soc2: {
    enabled: false,
    securityControls: false,
    availabilityControls: false,
    confidentialityControls: false,
  },
  hipaa: {
    enabled: false,
    phiProtection: false,
    auditControls: false,
    accessManagement: false,
  },
};

export class ComplianceToggleService {
  /**
   * Get compliance configuration for a tenant
   * Creates default config if none exists
   */
  async getConfig(tenantId: string): Promise<ComplianceConfig> {
    const result = await query<DatabaseRow>(
      `SELECT * FROM compliance_config WHERE tenant_id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      // Create default config
      return this.createDefaultConfig(tenantId);
    }

    return this.mapRowToConfig(result.rows[0]!);
  }

  /**
   * Create default compliance configuration for a tenant
   */
  private async createDefaultConfig(tenantId: string): Promise<ComplianceConfig> {
    const id = uuidv4();

    const result = await query<DatabaseRow>(
      `INSERT INTO compliance_config (id, tenant_id, master_enabled, module_config)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, tenantId, true, JSON.stringify(DEFAULT_MODULE_CONFIG)]
    );

    logger.info({ tenantId, configId: id }, 'Created default compliance config');

    return this.mapRowToConfig(result.rows[0]!);
  }

  /**
   * Toggle the master compliance switch
   */
  async toggleMaster(
    context: ComplianceServiceContext,
    request: ToggleMasterRequest
  ): Promise<ComplianceConfig> {
    const { tenantId, userId, ipAddress, userAgent, sessionId } = context;

    return transaction(async (client) => {
      // Set context for audit trigger
      await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
      await client.query(`SET LOCAL app.change_reason = $1`, [request.reason]);

      // Get current config (or create if doesn't exist)
      let configResult = await client.query<DatabaseRow>(
        `SELECT * FROM compliance_config WHERE tenant_id = $1 FOR UPDATE`,
        [tenantId]
      );

      let config: ComplianceConfig;

      if (configResult.rows.length === 0) {
        // Create new config
        const createResult = await client.query<DatabaseRow>(
          `INSERT INTO compliance_config (id, tenant_id, master_enabled, module_config)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [uuidv4(), tenantId, request.enabled, JSON.stringify(DEFAULT_MODULE_CONFIG)]
        );
        config = this.mapRowToConfig(createResult.rows[0]!);

        // Log creation
        await this.logConfigChange(client, {
          configId: config.id,
          tenantId,
          action: 'CREATE',
          changedBy: userId,
          changeReason: request.reason,
          previousState: null,
          newState: { masterEnabled: request.enabled, moduleConfig: DEFAULT_MODULE_CONFIG },
          moduleAffected: 'master',
          featureAffected: 'enabled',
          previousValue: undefined,
          newValue: request.enabled,
          ipAddress,
          userAgent,
          sessionId,
        });
      } else {
        const previousConfig = this.mapRowToConfig(configResult.rows[0]!);

        // Update master toggle
        const updateResult = await client.query<DatabaseRow>(
          `UPDATE compliance_config
           SET master_enabled = $1, updated_at = NOW()
           WHERE tenant_id = $2
           RETURNING *`,
          [request.enabled, tenantId]
        );
        config = this.mapRowToConfig(updateResult.rows[0]!);

        // Log the change
        await this.logConfigChange(client, {
          configId: config.id,
          tenantId,
          action: 'TOGGLE_MASTER',
          changedBy: userId,
          changeReason: request.reason,
          previousState: { masterEnabled: previousConfig.masterEnabled },
          newState: { masterEnabled: request.enabled },
          moduleAffected: 'master',
          featureAffected: 'enabled',
          previousValue: previousConfig.masterEnabled,
          newValue: request.enabled,
          ipAddress,
          userAgent,
          sessionId,
        });
      }

      logger.info(
        { tenantId, userId, enabled: request.enabled, reason: request.reason },
        'Master compliance toggle changed'
      );

      return config;
    });
  }

  /**
   * Toggle a specific compliance module or feature
   */
  async toggleModule(
    context: ComplianceServiceContext,
    request: ToggleModuleRequest
  ): Promise<ComplianceConfig> {
    const { tenantId, userId, ipAddress, userAgent, sessionId } = context;
    const { module, enabled, reason, feature } = request;

    return transaction(async (client) => {
      // Set context for audit trigger
      await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
      await client.query(`SET LOCAL app.change_reason = $1`, [reason]);

      // Get current config
      const configResult = await client.query<DatabaseRow>(
        `SELECT * FROM compliance_config WHERE tenant_id = $1 FOR UPDATE`,
        [tenantId]
      );

      if (configResult.rows.length === 0) {
        throw new Error(`Compliance config not found for tenant ${tenantId}`);
      }

      const previousConfig = this.mapRowToConfig(configResult.rows[0]!);
      const newModuleConfig = { ...previousConfig.moduleConfig };

      // Update the appropriate setting
      if (feature) {
        // Toggle specific feature within module
        const moduleConfig = newModuleConfig[module];
        if (!(feature in moduleConfig)) {
          throw new Error(`Feature ${feature} not found in module ${module}`);
        }
        (newModuleConfig[module] as Record<string, boolean>)[feature] = enabled;
      } else {
        // Toggle entire module
        newModuleConfig[module].enabled = enabled;
      }

      // Update in database
      const updateResult = await client.query<DatabaseRow>(
        `UPDATE compliance_config
         SET module_config = $1, updated_at = NOW()
         WHERE tenant_id = $2
         RETURNING *`,
        [JSON.stringify(newModuleConfig), tenantId]
      );

      const config = this.mapRowToConfig(updateResult.rows[0]!);

      // Log the change
      const previousValue = feature
        ? (previousConfig.moduleConfig[module] as Record<string, boolean>)[feature]
        : previousConfig.moduleConfig[module].enabled;

      await this.logConfigChange(client, {
        configId: config.id,
        tenantId,
        action: feature ? 'TOGGLE_FEATURE' : 'TOGGLE_MODULE',
        changedBy: userId,
        changeReason: reason,
        previousState: previousConfig.moduleConfig as unknown as Record<string, unknown>,
        newState: newModuleConfig as unknown as Record<string, unknown>,
        moduleAffected: module,
        featureAffected: feature ?? 'enabled',
        previousValue,
        newValue: enabled,
        ipAddress,
        userAgent,
        sessionId,
      });

      logger.info(
        { tenantId, userId, module, feature, enabled, reason },
        'Compliance module toggle changed'
      );

      return config;
    });
  }

  /**
   * Check if a specific module/feature is enabled
   */
  async isEnabled(
    tenantId: string,
    module: keyof ModuleConfigMap,
    feature?: string
  ): Promise<boolean> {
    const config = await this.getConfig(tenantId);

    // Check master switch first
    if (!config.masterEnabled) {
      return false;
    }

    // Check module enabled
    const moduleConfig = config.moduleConfig[module];
    if (!moduleConfig.enabled) {
      return false;
    }

    // If no specific feature, return module status
    if (!feature) {
      return true;
    }

    // Check specific feature
    const featureValue = (moduleConfig as Record<string, boolean>)[feature];
    return featureValue === true;
  }

  /**
   * Get configuration audit log for a tenant
   */
  async getAuditLog(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      module?: string;
    } = {}
  ): Promise<{ audits: ComplianceConfigAudit[]; total: number }> {
    const { limit = 50, offset = 0, action, module } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (action) {
      whereClause += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (module) {
      whereClause += ` AND module_affected = $${paramIndex}`;
      params.push(module);
      paramIndex++;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM compliance_config_audit ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Get audits
    const auditResult = await query<DatabaseRow>(
      `SELECT * FROM compliance_config_audit
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const audits = auditResult.rows.map((row) => this.mapRowToAudit(row));

    return { audits, total };
  }

  /**
   * Log a configuration change
   */
  private async logConfigChange(
    client: import('pg').PoolClient,
    data: {
      configId: string;
      tenantId: string;
      action: ComplianceConfigAudit['action'];
      changedBy: string;
      changeReason: string;
      previousState: Record<string, unknown> | null;
      newState: Record<string, unknown>;
      moduleAffected?: string;
      featureAffected?: string;
      previousValue?: boolean;
      newValue?: boolean;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO compliance_config_audit (
        id, config_id, tenant_id, action, changed_by, change_reason,
        previous_state, new_state, module_affected, feature_affected,
        previous_value, new_value, ip_address, user_agent, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        uuidv4(),
        data.configId,
        data.tenantId,
        data.action,
        data.changedBy,
        data.changeReason,
        data.previousState ? JSON.stringify(data.previousState) : null,
        JSON.stringify(data.newState),
        data.moduleAffected,
        data.featureAffected,
        data.previousValue,
        data.newValue,
        data.ipAddress,
        data.userAgent,
        data.sessionId,
      ]
    );
  }

  /**
   * Map database row to ComplianceConfig
   */
  private mapRowToConfig(row: DatabaseRow): ComplianceConfig {
    return {
      id: row['id'] as string,
      tenantId: row['tenant_id'] as string,
      masterEnabled: row['master_enabled'] as boolean,
      moduleConfig: (typeof row['module_config'] === 'string'
        ? JSON.parse(row['module_config'] as string)
        : row['module_config']) as ModuleConfigMap,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  /**
   * Map database row to ComplianceConfigAudit
   */
  private mapRowToAudit(row: DatabaseRow): ComplianceConfigAudit {
    return snakeToCamel<ComplianceConfigAudit>({
      ...row,
      previousState: row['previous_state']
        ? (typeof row['previous_state'] === 'string'
            ? JSON.parse(row['previous_state'] as string)
            : row['previous_state'])
        : null,
      newState:
        typeof row['new_state'] === 'string'
          ? JSON.parse(row['new_state'] as string)
          : row['new_state'],
      createdAt: new Date(row['created_at'] as string),
    });
  }
}

// Singleton instance
export const complianceToggleService = new ComplianceToggleService();
