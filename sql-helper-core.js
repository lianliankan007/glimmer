'use strict';

/** SQL 列表转换规则：仅处理文本，不连接数据库，也不执行生成的语句。 */
const SqlHelper = (() => {
  /**
   * 解析原始值列表，识别成对引号和重复引号转义，保留引号内的分隔符。
   * @param {string} text 原始输入，仅接受值列表，不接受完整 SQL 语句。
   * @param {string} separator auto 为逗号、分号、换行和 Tab；lines 仅换行；spaces 额外按空格拆分。
   * @returns {string[]} 去除空项后的值，超长整数和前导零均按原始文本保留。
   * @throws {Error} 成对引号未闭合，或闭合引号后出现非分隔内容。
   */
  function parseValues(text, separator = 'auto') {
    const delimiter = separator === 'lines' ? /[\r\n]/
      : separator === 'spaces' ? /[\s,，;；]/ : /[,，;；\r\n\t]/;
    const values = [];
    let value = '', quote = '', quoted = false, closed = false;

    /** 完成一项；只裁掉未加引号值两端的空白，保留显式引用的内容。 */
    function finish() {
      const result = quoted ? value : value.trim();
      if (result !== '') values.push(result);
      value = '';
      quoted = false;
      closed = false;
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quote) {
        if (char === quote && text[i + 1] === quote) {
          value += quote;
          i++;
        } else if (char === quote) {
          quote = '';
          closed = true;
        } else value += char;
      } else if (delimiter.test(char)) finish();
      else if (closed) {
        if (!/\s/.test(char)) throw new Error('闭合引号后需要分隔符，请检查输入内容。');
      } else if ((char === "'" || char === '"') && value.trim() === '') {
        quote = char;
        quoted = true;
        value = '';
      } else value += char;
    }
    if (quote) throw new Error('存在未闭合的引号，请补齐后再生成。');
    finish();
    return values;
  }

  /**
   * 生成可复制的 IN 条件，字符串使用单引号，值内单引号按 SQL 规则加倍。
   * @param {string} text 原始值列表。
   * @param {object} options 输出配置。
   * @param {string} [options.separator] 输入分隔方式。
   * @param {boolean} [options.dedupe=true] 按原始字符串去重并保持首次出现顺序。
   * @param {string} [options.quote='single'] single 为字符串，number 为仅整数且不加引号。
   * @param {number} [options.perLine=0] 0 输出单行，1、5、10 表示每行的项数。
   * @param {string} [options.field=''] 可选字段名，支持点号分隔的简单标识符。
   * @returns {{sql: string, total: number, count: number, removed: number}} 结果及去重统计；空输入返回空结果。
   */
  function buildSql(text, options = {}) {
    const parsed = parseValues(text, options.separator);
    const values = options.dedupe === false ? parsed : [...new Set(parsed)];
    const field = (options.field || '').trim();
    if (field && !/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(field)) {
      throw new Error('字段名仅支持字母、数字、下划线和点号，例如 id 或 orders.id。');
    }
    // 数字模式不做 Number 转换，避免雪花 ID 被截断；也不接受表达式混入值列表。
    if (options.quote === 'number' && values.some(value => !/^[+-]?\d+$/.test(value))) {
      throw new Error('不加引号模式仅支持整数 ID；包含文字或小数时请使用单引号模式。');
    }
    const literals = values.map(value => options.quote === 'number' ? value : `'${value.replace(/'/g, "''")}'`);
    const perLine = [1, 5, 10].includes(options.perLine) ? options.perLine : 0;
    const lines = [];
    if (perLine) {
      for (let i = 0; i < literals.length; i += perLine) lines.push('  ' + literals.slice(i, i + perLine).join(', '));
    }
    // 空输入不生成 IN ()，避免把无效条件误当作可用结果。
    const sql = literals.length ? `${field ? field + ' ' : ''}IN (${perLine ? '\n' + lines.join(',\n') + '\n' : literals.join(', ')})` : '';
    return { sql, total: parsed.length, count: values.length, removed: parsed.length - values.length };
  }
  return { parseValues, buildSql };
})();
