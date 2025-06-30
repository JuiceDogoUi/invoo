/**
 * PRODUCTION DEPLOYMENT SAFEGUARDS
 * Enterprise-grade safety mechanisms for VeriFactu production deployment
 */

export interface SafeguardConfig {
  enablePreflightChecks: boolean
  enableCircuitBreaker: boolean
  enableCanaryMode: boolean
  maxDailyInvoices: number
  maxHourlyInvoices: number
  alertThresholds: {
    errorRate: number // Percentage
    responseTime: number // Milliseconds
    queueDepth: number
  }
  emergencyContacts: string[]
}

export interface HealthMetrics {
  timestamp: Date
  apiResponseTime: number
  errorRate: number
  successfulRequests: number
  failedRequests: number
  queueDepth: number
  memoryUsage: number
  cpuUsage: number
}

// Circuit breaker pattern implementation
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime?: Date
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeoutMs = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN - API temporarily unavailable')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime()
    return timeSinceLastFailure >= this.recoveryTimeoutMs
  }

  getState(): string {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }
}

// Rate limiting for production safety
class ProductionRateLimiter {
  private dailyCount = 0
  private hourlyCount = 0
  private lastDailyReset = new Date()
  private lastHourlyReset = new Date()

  constructor(
    private maxDaily: number,
    private maxHourly: number
  ) {}

  canProceed(): { allowed: boolean; reason?: string; retryAfter?: number } {
    this.resetCountersIfNeeded()

    if (this.dailyCount >= this.maxDaily) {
      const resetTime = new Date(this.lastDailyReset)
      resetTime.setDate(resetTime.getDate() + 1)
      resetTime.setHours(0, 0, 0, 0)
      
      return {
        allowed: false,
        reason: 'Daily limit exceeded',
        retryAfter: resetTime.getTime() - Date.now()
      }
    }

    if (this.hourlyCount >= this.maxHourly) {
      const resetTime = new Date(this.lastHourlyReset)
      resetTime.setHours(resetTime.getHours() + 1, 0, 0, 0)
      
      return {
        allowed: false,
        reason: 'Hourly limit exceeded',
        retryAfter: resetTime.getTime() - Date.now()
      }
    }

    return { allowed: true }
  }

  recordRequest(): void {
    this.resetCountersIfNeeded()
    this.dailyCount++
    this.hourlyCount++
  }

  private resetCountersIfNeeded(): void {
    const now = new Date()
    
    // Reset daily counter
    if (now.getDate() !== this.lastDailyReset.getDate() || 
        now.getMonth() !== this.lastDailyReset.getMonth() ||
        now.getFullYear() !== this.lastDailyReset.getFullYear()) {
      this.dailyCount = 0
      this.lastDailyReset = now
    }
    
    // Reset hourly counter
    if (now.getHours() !== this.lastHourlyReset.getHours() ||
        now.getDate() !== this.lastHourlyReset.getDate()) {
      this.hourlyCount = 0
      this.lastHourlyReset = now
    }
  }

  getUsage(): { daily: number; hourly: number; limits: { daily: number; hourly: number } } {
    this.resetCountersIfNeeded()
    return {
      daily: this.dailyCount,
      hourly: this.hourlyCount,
      limits: {
        daily: this.maxDaily,
        hourly: this.maxHourly
      }
    }
  }
}

// Health monitoring system
class HealthMonitor {
  private metrics: HealthMetrics[] = []
  private maxMetricsHistory = 1000

  recordMetric(metric: HealthMetrics): void {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }
  }

  getRecentMetrics(minutes = 5): HealthMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.metrics.filter(m => m.timestamp >= cutoff)
  }

  getCurrentHealthStatus(): {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
    issues: string[]
    metrics: {
      avgResponseTime: number
      errorRate: number
      requestsPerMinute: number
    }
  } {
    const recentMetrics = this.getRecentMetrics()
    
    if (recentMetrics.length === 0) {
      return {
        status: 'UNHEALTHY',
        issues: ['No recent metrics available'],
        metrics: { avgResponseTime: 0, errorRate: 0, requestsPerMinute: 0 }
      }
    }

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.apiResponseTime, 0) / recentMetrics.length
    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.successfulRequests + m.failedRequests, 0)
    const totalFailed = recentMetrics.reduce((sum, m) => sum + m.failedRequests, 0)
    const errorRate = totalRequests > 0 ? (totalFailed / totalRequests) * 100 : 0
    const requestsPerMinute = totalRequests / 5 // 5-minute window

    const issues: string[] = []
    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY'

    if (avgResponseTime > 5000) {
      issues.push('High response time')
      status = 'DEGRADED'
    }

    if (avgResponseTime > 10000) {
      status = 'UNHEALTHY'
    }

    if (errorRate > 5) {
      issues.push('High error rate')
      status = 'DEGRADED'
    }

    if (errorRate > 15) {
      status = 'UNHEALTHY'
    }

    const avgQueueDepth = recentMetrics.reduce((sum, m) => sum + m.queueDepth, 0) / recentMetrics.length
    if (avgQueueDepth > 100) {
      issues.push('High queue depth')
      status = status === 'HEALTHY' ? 'DEGRADED' : status
    }

    return {
      status,
      issues,
      metrics: {
        avgResponseTime,
        errorRate,
        requestsPerMinute
      }
    }
  }
}

// Main production safeguards coordinator
export class ProductionSafeguards {
  private circuitBreaker: CircuitBreaker
  private rateLimiter: ProductionRateLimiter
  private healthMonitor: HealthMonitor
  private config: SafeguardConfig
  private isCanaryMode = false
  private canaryPercentage = 10 // Start with 10% traffic

  constructor(config: SafeguardConfig) {
    this.config = config
    this.circuitBreaker = new CircuitBreaker()
    this.rateLimiter = new ProductionRateLimiter(config.maxDailyInvoices, config.maxHourlyInvoices)
    this.healthMonitor = new HealthMonitor()
  }

  // Pre-flight checks before processing invoice
  async preflightCheck(): Promise<{ canProceed: boolean; reason?: string; retryAfter?: number }> {
    if (!this.config.enablePreflightChecks) {
      return { canProceed: true }
    }

    // Check rate limits
    const rateLimitResult = this.rateLimiter.canProceed()
    if (!rateLimitResult.allowed) {
      return {
        canProceed: false,
        reason: rateLimitResult.reason,
        retryAfter: rateLimitResult.retryAfter
      }
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker && this.circuitBreaker.getState() === 'OPEN') {
      return {
        canProceed: false,
        reason: 'Circuit breaker is open - API temporarily unavailable'
      }
    }

    // Check canary mode
    if (this.config.enableCanaryMode && this.isCanaryMode) {
      const shouldAllow = Math.random() * 100 < this.canaryPercentage
      if (!shouldAllow) {
        return {
          canProceed: false,
          reason: 'Canary mode - request excluded from processing'
        }
      }
    }

    // Check system health
    const health = this.healthMonitor.getCurrentHealthStatus()
    if (health.status === 'UNHEALTHY') {
      return {
        canProceed: false,
        reason: `System unhealthy: ${health.issues.join(', ')}`
      }
    }

    return { canProceed: true }
  }

  // Execute operation with safeguards
  async executeWithSafeguards<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    try {
      // Record rate limit
      this.rateLimiter.recordRequest()

      // Execute with circuit breaker if enabled
      let result: T
      if (this.config.enableCircuitBreaker) {
        result = await this.circuitBreaker.execute(operation)
      } else {
        result = await operation()
      }

      // Record success metrics
      const responseTime = Date.now() - startTime
      this.recordMetrics(responseTime, true)

      return result

    } catch (error) {
      // Record failure metrics
      const responseTime = Date.now() - startTime
      this.recordMetrics(responseTime, false)

      // Check if we should trigger alerts
      await this.checkAlerts()

      throw error
    }
  }

  // Record performance metrics
  private recordMetrics(responseTime: number, success: boolean): void {
    const metric: HealthMetrics = {
      timestamp: new Date(),
      apiResponseTime: responseTime,
      errorRate: 0, // Will be calculated by health monitor
      successfulRequests: success ? 1 : 0,
      failedRequests: success ? 0 : 1,
      queueDepth: 0, // Would be populated by queue monitoring
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0 // Would be populated by system monitoring
    }

    this.healthMonitor.recordMetric(metric)
  }

  // Get memory usage (simplified)
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
    return 0
  }

  // Check if alerts should be triggered
  private async checkAlerts(): Promise<void> {
    const health = this.healthMonitor.getCurrentHealthStatus()
    
    if (health.status === 'UNHEALTHY') {
      await this.triggerAlert('CRITICAL', `VeriFactu API unhealthy: ${health.issues.join(', ')}`, health.metrics)
    } else if (health.status === 'DEGRADED') {
      await this.triggerAlert('WARNING', `VeriFactu API degraded: ${health.issues.join(', ')}`, health.metrics)
    }
  }

  // Trigger alert notification
  private async triggerAlert(level: 'WARNING' | 'CRITICAL', message: string, metrics: any): Promise<void> {
    console.error(`[${level}] VeriFactu Alert: ${message}`, metrics)
    
    // In production, this would send notifications to configured channels
    // (email, Slack, PagerDuty, etc.)
    
    if (level === 'CRITICAL' && this.config.enableCanaryMode) {
      this.enableCanaryMode()
    }
  }

  // Enable canary mode (reduce traffic)
  enableCanaryMode(): void {
    this.isCanaryMode = true
    this.canaryPercentage = 5 // Reduce to 5% traffic
    console.warn('🚨 Canary mode enabled - reducing traffic to 5%')
  }

  // Disable canary mode
  disableCanaryMode(): void {
    this.isCanaryMode = false
    console.info('✅ Canary mode disabled - normal traffic resumed')
  }

  // Get current status
  getStatus(): {
    safeguards: {
      circuitBreakerState: string
      rateLimitUsage: any
      canaryMode: boolean
    }
    health: any
    alerts: string[]
  } {
    const health = this.healthMonitor.getCurrentHealthStatus()
    const rateLimitUsage = this.rateLimiter.getUsage()
    
    return {
      safeguards: {
        circuitBreakerState: this.circuitBreaker.getState(),
        rateLimitUsage,
        canaryMode: this.isCanaryMode
      },
      health,
      alerts: health.issues
    }
  }

  // Emergency shutdown
  emergencyShutdown(): void {
    console.error('🚨 EMERGENCY SHUTDOWN ACTIVATED')
    this.isCanaryMode = true
    this.canaryPercentage = 0 // Block all traffic
    
    // Trigger critical alerts
    this.triggerAlert('CRITICAL', 'Emergency shutdown activated - all VeriFactu traffic blocked', {})
  }

  // Reset all safeguards (for testing/recovery)
  reset(): void {
    this.circuitBreaker = new CircuitBreaker()
    this.isCanaryMode = false
    this.canaryPercentage = 10
    console.info('✅ Production safeguards reset')
  }
}

// Default production configuration
export const defaultProductionConfig: SafeguardConfig = {
  enablePreflightChecks: true,
  enableCircuitBreaker: true,
  enableCanaryMode: true,
  maxDailyInvoices: 10000,
  maxHourlyInvoices: 1000,
  alertThresholds: {
    errorRate: 5, // 5%
    responseTime: 5000, // 5 seconds
    queueDepth: 100
  },
  emergencyContacts: [
    'admin@invoo.es',
    'tech@invoo.es'
  ]
}

// Singleton for production use
export const productionSafeguards = new ProductionSafeguards(
  process.env.NODE_ENV === 'production' ? defaultProductionConfig : {
    ...defaultProductionConfig,
    enablePreflightChecks: false,
    enableCircuitBreaker: false,
    enableCanaryMode: false
  }
)