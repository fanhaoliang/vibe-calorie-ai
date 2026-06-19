// @ts-check
/**
 * 应用层有名异常：携带 HTTP 状态码与业务 code，便于全局错误处理映射成
 * 正确的响应。除非真的是 unexpected error，否则都应该用 AppError 抛。
 *
 *   new AppError('NOT_FOUND', '...', 404)
 *   AppError.notFound('Food entry not found')
 *   AppError.validation('请输入要记录的内容')
 */
export class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status]
   */
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }

  /** @param {string} message */
  static notFound(message) {
    return new AppError('NOT_FOUND', message, 404);
  }

  /** @param {string} message */
  static validation(message) {
    return new AppError('VALIDATION_ERROR', message, 400);
  }
}
