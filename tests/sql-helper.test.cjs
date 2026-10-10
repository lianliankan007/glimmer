const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 在独立上下文加载浏览器使用的同一份转换逻辑，验证真实规则而非另写一套实现。
const helper = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sql-helper-core.js'), 'utf8') + '\nSqlHelper;');

test('混合分隔符、空项和重复值按原顺序处理', () => {
  const result = helper.buildSql('10001,10002\r\n10001；\t10003， ; ');
  assert.equal(result.sql, "IN ('10001', '10002', '10003')");
  assert.equal(result.total, 4);
  assert.equal(result.removed, 1);
});

test('超长 ID 和前导零不会因数字转换丢失', () => {
  const text = '00123\n9223372036854775807';
  assert.equal(helper.buildSql(text).sql, "IN ('00123', '9223372036854775807')");
  assert.equal(helper.buildSql(text, { quote: 'number' }).sql, 'IN (00123, 9223372036854775807)');
});

test('移除成对引号，保留引用内分隔符并转义单引号', () => {
  assert.equal(helper.buildSql(`'O''Brien', "a,b", 'a;\nb', O'Brien`).sql, "IN ('O''Brien', 'a,b', 'a;\nb')");
  assert.equal(helper.buildSql('"a""b", " x "').sql, `IN ('a"b', ' x ')`);
});

test('关闭去重后保留重复项', () => {
  assert.equal(helper.buildSql('a,a', { dedupe: false }).sql, "IN ('a', 'a')");
});

test('换行模式保留逗号，空白模式拆分空格', () => {
  assert.equal(helper.buildSql('a,b\nc', { separator: 'lines' }).sql, "IN ('a,b', 'c')");
  assert.equal(helper.buildSql('a b\tc', { separator: 'spaces' }).sql, "IN ('a', 'b', 'c')");
});

test('输出字段名及多行条件，无尾随逗号', () => {
  assert.equal(helper.buildSql('1,2', { field: 'orders.id', perLine: 1, quote: 'number' }).sql, 'orders.id IN (\n  1,\n  2\n)');
  assert.equal(helper.buildSql('1,2,3,4,5,6', { perLine: 5, quote: 'number' }).sql, 'IN (\n  1, 2, 3, 4, 5,\n  6\n)');
});

test('空输入不会生成无效 IN 条件', () => {
  assert.equal(helper.buildSql(" ,\n'';\t").sql, '');
});

test('不完整的引用明确报错', () => {
  assert.throws(() => helper.buildSql("'abc"), /未闭合/);
  assert.throws(() => helper.buildSql("'abc'def"), /分隔符/);
});

test('整数模式拒绝非整数及 SQL 表达式', () => {
  for (const value of ['a', '1.2', '1e3', 'NULL', '1) OR 1=1']) {
    assert.throws(() => helper.buildSql(value, { quote: 'number' }), /仅支持整数/);
  }
  assert.equal(helper.buildSql('-1,+2', { quote: 'number' }).sql, 'IN (-1, +2)');
});

test('字段名拒绝表达式，字符串内容只作为值输出', () => {
  assert.throws(() => helper.buildSql('1', { field: 'id) OR 1=1' }), /字段名/);
  assert.equal(helper.buildSql("x') OR 1=1 --").sql, "IN ('x'') OR 1=1 --')");
});
