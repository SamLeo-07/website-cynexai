/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── Pure JavaScript SQL Engine ────────────────────────────────────────────────
// No dependencies. No WASM. No network. Works offline & in production.
// Supports: SELECT, WHERE, JOIN, GROUP BY, HAVING, ORDER BY, LIMIT,
//           DISTINCT, COUNT/SUM/AVG/MIN/MAX, LIKE, IN, BETWEEN, IS NULL

type Row = Record<string, any>;

// ── Fixed EMP / DEPT dataset ──────────────────────────────────────────────────
const EMP_ROWS: Row[] = [
  { empno: 7369, ename: 'SMITH',  job: 'CLERK',     mgr: 7902, hiredate: '1980-12-17', sal: 800,  comm: null, deptno: 20 },
  { empno: 7499, ename: 'ALLEN',  job: 'SALESMAN',  mgr: 7698, hiredate: '1981-02-20', sal: 1600, comm: 300,  deptno: 30 },
  { empno: 7521, ename: 'WARD',   job: 'SALESMAN',  mgr: 7698, hiredate: '1981-02-22', sal: 1250, comm: 500,  deptno: 30 },
  { empno: 7566, ename: 'JONES',  job: 'MANAGER',   mgr: 7839, hiredate: '1981-04-02', sal: 2975, comm: null, deptno: 20 },
  { empno: 7654, ename: 'MARTIN', job: 'SALESMAN',  mgr: 7698, hiredate: '1981-09-28', sal: 1250, comm: 1400, deptno: 30 },
  { empno: 7698, ename: 'BLAKE',  job: 'MANAGER',   mgr: 7839, hiredate: '1981-05-01', sal: 2850, comm: null, deptno: 30 },
  { empno: 7782, ename: 'CLARK',  job: 'MANAGER',   mgr: 7839, hiredate: '1981-06-09', sal: 2450, comm: null, deptno: 10 },
  { empno: 7788, ename: 'SCOTT',  job: 'ANALYST',   mgr: 7566, hiredate: '1987-04-19', sal: 3000, comm: null, deptno: 20 },
  { empno: 7839, ename: 'KING',   job: 'PRESIDENT', mgr: null, hiredate: '1981-11-17', sal: 5000, comm: null, deptno: 10 },
  { empno: 7844, ename: 'TURNER', job: 'SALESMAN',  mgr: 7698, hiredate: '1981-09-08', sal: 1500, comm: 0,    deptno: 30 },
  { empno: 7876, ename: 'ADAMS',  job: 'CLERK',     mgr: 7788, hiredate: '1987-05-23', sal: 1100, comm: null, deptno: 20 },
  { empno: 7900, ename: 'JAMES',  job: 'CLERK',     mgr: 7698, hiredate: '1981-12-03', sal: 950,  comm: null, deptno: 30 },
  { empno: 7902, ename: 'FORD',   job: 'ANALYST',   mgr: 7566, hiredate: '1981-12-03', sal: 3000, comm: null, deptno: 20 },
  { empno: 7934, ename: 'MILLER', job: 'CLERK',     mgr: 7782, hiredate: '1982-01-23', sal: 1300, comm: null, deptno: 10 },
];

const DEPT_ROWS: Row[] = [
  { deptno: 10, dname: 'ACCOUNTING', loc: 'NEW YORK' },
  { deptno: 20, dname: 'RESEARCH',   loc: 'DALLAS'   },
  { deptno: 30, dname: 'SALES',      loc: 'CHICAGO'  },
  { deptno: 40, dname: 'OPERATIONS', loc: 'BOSTON'   },
];

const DB: Record<string, Row[]> = { emp: EMP_ROWS, dept: DEPT_ROWS };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a column reference like "e.ename", "ename", "sal" against a row */
function getCol(expr: string, row: Row): any {
  const key = expr.trim().toLowerCase();
  // Try dotted e.g. "e.ename" → look up "ename"
  const dot = key.lastIndexOf('.');
  const bare = dot >= 0 ? key.substring(dot + 1) : key;
  if (row[bare] !== undefined) return row[bare];
  // Also try the full key in case it was stored with prefix
  if (row[key] !== undefined) return row[key];
  return undefined;
}

/** Parse a literal value from a string token */
function parseLit(tok: string): any {
  const t = tok.trim();
  if (/^'.*'$/.test(t)) return t.slice(1, -1);  // string
  if (/^".*"$/.test(t)) return t.slice(1, -1);
  if (t.toUpperCase() === 'NULL') return null;
  const n = Number(t);
  return isNaN(n) ? t : n;
}

/** Get a value from a row for an expression (column ref or literal) */
function getValue(expr: string, row: Row): any {
  const t = expr.trim();
  if (/^'.*'$/.test(t) || /^".*"$/.test(t)) return parseLit(t);
  const n = Number(t);
  if (!isNaN(n)) return n;
  if (t.toUpperCase() === 'NULL') return null;
  return getCol(t, row);
}

/** Compare two values with an operator */
function compare(a: any, op: string, b: any): boolean {
  if (a === null || a === undefined) {
    if (b === null || b === undefined) return op === '=' || op === '<=>';
    return false;
  }
  if (b === null || b === undefined) return false;
  // Numeric comparison
  const an = Number(a), bn = Number(b);
  const useNum = !isNaN(an) && !isNaN(bn);
  const av = useNum ? an : String(a).toUpperCase();
  const bv = useNum ? bn : String(b).toUpperCase();
  switch (op) {
    case '=':  return av === bv;
    case '!=': case '<>': return av !== bv;
    case '>':  return av > bv;
    case '>=': return av >= bv;
    case '<':  return av < bv;
    case '<=': return av <= bv;
  }
  return false;
}

// ── Condition evaluator ────────────────────────────────────────────────────────

/** Split a condition string by a top-level keyword (AND or OR), respecting parens */
function splitByKw(cond: string, kw: string): string[] {
  const parts: string[] = [];
  let depth = 0, buf = '', i = 0;
  const up = cond.toUpperCase();
  while (i < cond.length) {
    if (cond[i] === '(') { depth++; buf += cond[i++]; continue; }
    if (cond[i] === ')') { depth--; buf += cond[i++]; continue; }
    if (depth === 0 && up.startsWith(kw, i) && (i === 0 || /\s/.test(cond[i-1])) && (i + kw.length >= cond.length || /\s/.test(cond[i + kw.length]))) {
      parts.push(buf.trim());
      buf = '';
      i += kw.length;
      continue;
    }
    buf += cond[i++];
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.length > 1 ? parts : [cond];
}

function evalCond(cond: string, row: Row): boolean {
  let c = cond.trim();
  // Strip outer parens
  while (c.startsWith('(') && c.endsWith(')')) {
    let depth = 0; let ok = true;
    for (let i = 0; i < c.length; i++) {
      if (c[i] === '(') depth++;
      else if (c[i] === ')') { depth--; if (depth === 0 && i < c.length - 1) { ok = false; break; } }
    }
    if (ok) c = c.slice(1, -1).trim(); else break;
  }

  // OR
  const orParts = splitByKw(c, ' OR ');
  if (orParts.length > 1) return orParts.some(p => evalCond(p, row));

  // AND
  const andParts = splitByKw(c, ' AND ');
  if (andParts.length > 1) return andParts.every(p => evalCond(p, row));

  // NOT
  if (/^NOT\s+/i.test(c)) return !evalCond(c.replace(/^NOT\s+/i, ''), row);

  // IS NOT NULL
  const isNotNull = c.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNull) { const v = getValue(isNotNull[1].trim(), row); return v !== null && v !== undefined; }

  // IS NULL
  const isNull = c.match(/^(.+?)\s+IS\s+NULL$/i);
  if (isNull) { const v = getValue(isNull[1].trim(), row); return v === null || v === undefined; }

  // BETWEEN
  const betw = c.match(/^(.+?)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
  if (betw) {
    const v = getValue(betw[1].trim(), row);
    const lo = parseLit(betw[2].trim()), hi = parseLit(betw[3].trim());
    return compare(v, '>=', lo) && compare(v, '<=', hi);
  }

  // NOT IN
  const notIn = c.match(/^(.+?)\s+NOT\s+IN\s*\((.+)\)$/i);
  if (notIn) {
    const v = getValue(notIn[1].trim(), row);
    const items = notIn[2].split(',').map(x => parseLit(x.trim()));
    return !items.some(it => compare(v, '=', it));
  }

  // IN
  const inM = c.match(/^(.+?)\s+IN\s*\((.+)\)$/i);
  if (inM) {
    const v = getValue(inM[1].trim(), row);
    const items = inM[2].split(',').map(x => parseLit(x.trim()));
    return items.some(it => compare(v, '=', it));
  }

  // NOT LIKE
  const notLike = c.match(/^(.+?)\s+NOT\s+LIKE\s+(.+)$/i);
  if (notLike) {
    const v = String(getValue(notLike[1].trim(), row) ?? '').toUpperCase();
    const pat = parseLit(notLike[2].trim()).toString().toUpperCase().replace(/%/g, '.*').replace(/_/g, '.');
    return !new RegExp('^' + pat + '$').test(v);
  }

  // LIKE
  const likeM = c.match(/^(.+?)\s+LIKE\s+(.+)$/i);
  if (likeM) {
    const v = String(getValue(likeM[1].trim(), row) ?? '').toUpperCase();
    const pat = parseLit(likeM[2].trim()).toString().toUpperCase().replace(/%/g, '.*').replace(/_/g, '.');
    return new RegExp('^' + pat + '$').test(v);
  }

  // Comparison: col op val
  const comp = c.match(/^(.+?)\s*(>=|<=|<>|!=|=|>|<)\s*(.+)$/);
  if (comp) {
    const left = getValue(comp[1].trim(), row);
    const right = getValue(comp[3].trim(), row) ?? parseLit(comp[3].trim());
    return compare(left, comp[2], right);
  }

  throw new Error(`Cannot parse WHERE condition: "${c}"`);
}

// ── Aggregate expression evaluator ────────────────────────────────────────────

const AGG_RE = /^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|[\w.]+)\s*\)$/i;

function isAgg(expr: string) { return AGG_RE.test(expr.trim()); }

function evalAgg(fn: string, col: string, rows: Row[]): number | null {
  if (fn === 'COUNT') {
    if (col === '*') return rows.length;
    return rows.filter(r => getValue(col, r) !== null && getValue(col, r) !== undefined).length;
  }
  const vals = rows.map(r => Number(getValue(col, r))).filter(v => !isNaN(v));
  if (vals.length === 0) return null;
  if (fn === 'SUM') return vals.reduce((a, b) => a + b, 0);
  if (fn === 'AVG') return vals.reduce((a, b) => a + b, 0) / vals.length;
  if (fn === 'MIN') return Math.min(...vals);
  if (fn === 'MAX') return Math.max(...vals);
  return null;
}

// ── Clause splitter ────────────────────────────────────────────────────────────

/** Parse SELECT column list respecting parentheses (for aggregate functions) */
function parseSelectCols(selectStr: string): { expr: string; alias: string }[] {
  const cols: { expr: string; alias: string }[] = [];
  let depth = 0, buf = '', i = 0;
  const s = selectStr.trim();
  while (i <= s.length) {
    const ch = s[i] ?? ',';
    if (ch === '(') { depth++; buf += ch; }
    else if (ch === ')') { depth--; buf += ch; }
    else if (ch === ',' && depth === 0) {
      const part = buf.trim();
      // Check for AS alias
      const asM = part.match(/^(.+?)\s+AS\s+(\w+)$/i);
      if (asM) cols.push({ expr: asM[1].trim(), alias: asM[2] });
      else cols.push({ expr: part, alias: part.replace(/\w+\./g, '') }); // strip table prefix for display
      buf = '';
    } else { buf += ch; }
    i++;
  }
  return cols;
}

// ── Main execute function ──────────────────────────────────────────────────────

export function runSQLEngine(rawSQL: string): { columns: string[]; rows: any[][] } {
  // Strip comments and semicolons
  let sql = rawSQL
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/;+$/, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!sql) throw new Error('Empty query.');

  const upper = sql.toUpperCase();
  if (!upper.startsWith('SELECT')) {
    throw new Error('Only SELECT statements are supported in this SQL sandbox.');
  }

  // ── Locate clause boundaries ─────────────────────────────────────────────
  // We scan for keyword positions at the top level (depth=0 for parens)
  const KWS = ['SELECT', 'FROM', 'INNER JOIN', 'LEFT OUTER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN', 'ON', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'];
  
  interface KwPos { kw: string; start: number; end: number; }
  const found: KwPos[] = [];
  
  for (const kw of KWS) {
    const re = new RegExp('(?<![A-Z])' + kw.replace(' ', '\\s+') + '(?![A-Z])', 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      found.push({ kw: kw.toUpperCase(), start: m.index, end: m.index + m[0].length });
    }
  }
  found.sort((a, b) => a.start - b.start);
  
  // Build a map of clause → content
  const clauseMap: Record<string, string> = {};
  for (let i = 0; i < found.length; i++) {
    const curr = found[i];
    const next = found[i + 1];
    clauseMap[curr.kw] = sql.substring(curr.end, next ? next.start : sql.length).trim();
  }

  // ── SELECT columns ────────────────────────────────────────────────────────
  let selectRaw = clauseMap['SELECT'] ?? '';
  const distinct = /^DISTINCT\s+/i.test(selectRaw);
  if (distinct) selectRaw = selectRaw.replace(/^DISTINCT\s+/i, '');

  // ── FROM table ────────────────────────────────────────────────────────────
  const fromRaw = clauseMap['FROM'] ?? '';
  if (!fromRaw) throw new Error('Missing FROM clause.');

  // Parse "tablename alias" or "tablename"
  const fromParts = fromRaw.trim().split(/\s+/);
  const fromTable = fromParts[0].toLowerCase();
  const fromAlias = fromParts[1]?.toLowerCase() || fromTable;
  
  const baseData = DB[fromTable];
  if (!baseData) throw new Error(`Unknown table "${fromTable}". Available: emp, dept`);

  // Tag rows with table prefix
  let rows: Row[] = baseData.map(r => {
    const prefixed: Row = {};
    for (const k of Object.keys(r)) {
      prefixed[k] = r[k];
      prefixed[`${fromAlias}.${k}`] = r[k];
      if (fromAlias !== fromTable) prefixed[`${fromTable}.${k}`] = r[k];
    }
    return prefixed;
  });

  // ── JOIN ──────────────────────────────────────────────────────────────────
  const joinKw = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'LEFT OUTER JOIN', 'RIGHT JOIN', 'FULL JOIN'].find(k => clauseMap[k]);
  if (joinKw) {
    const joinRaw = clauseMap[joinKw]!;
    const joinParts = joinRaw.split(/\s+/);
    const joinTable = joinParts[0].toLowerCase();
    const joinAlias = (joinParts[1]?.toUpperCase() === 'ON' ? joinParts[0] : joinParts[1] ?? joinParts[0]).toLowerCase();
    const onRaw = clauseMap['ON'] ?? '';

    const joinData = DB[joinTable];
    if (!joinData) throw new Error(`Unknown JOIN table "${joinTable}". Available: emp, dept`);

    // Build joined rows
    const joined: Row[] = [];
    for (const leftRow of rows) {
      let matched = false;
      for (const rightRow of joinData) {
        const rightPrefixed: Row = {};
        for (const k of Object.keys(rightRow)) {
          rightPrefixed[k] = rightRow[k];
          rightPrefixed[`${joinAlias}.${k}`] = rightRow[k];
          if (joinAlias !== joinTable) rightPrefixed[`${joinTable}.${k}`] = rightRow[k];
        }
        const combined = { ...leftRow, ...rightPrefixed };
        if (!onRaw || evalCond(onRaw, combined)) {
          joined.push(combined);
          matched = true;
        }
      }
      // LEFT JOIN: include unmatched left rows
      if (!matched && (joinKw === 'LEFT JOIN' || joinKw === 'LEFT OUTER JOIN')) {
        joined.push({ ...leftRow });
      }
    }
    rows = joined;
  }

  // ── WHERE ─────────────────────────────────────────────────────────────────
  if (clauseMap['WHERE']) {
    rows = rows.filter(r => {
      try { return evalCond(clauseMap['WHERE']!, r); }
      catch (e: any) { throw new Error(`WHERE error: ${e.message}`); }
    });
  }

  // ── GROUP BY + Aggregates ─────────────────────────────────────────────────
  const selectCols = selectRaw.trim() === '*'
    ? Object.keys(rows[0] ?? {}).filter(k => !k.includes('.')).map(k => ({ expr: k, alias: k }))
    : parseSelectCols(selectRaw);

  const hasAggInSelect = selectCols.some(c => isAgg(c.expr));
  const groupByRaw = clauseMap['GROUP BY'];

  let resultRows: Row[] = [];
  let outputCols: string[] = [];

  if (groupByRaw || hasAggInSelect) {
    // Group rows
    const groupByCols = groupByRaw ? groupByRaw.split(',').map(c => c.trim()) : [];
    
    const groups = new Map<string, Row[]>();
    for (const row of rows) {
      const key = groupByCols.map(col => getValue(col, row)).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    
    // If no GROUP BY but has aggregates, treat all rows as one group
    if (groupByCols.length === 0 && hasAggInSelect) {
      groups.set('__all__', rows);
    }

    // Build result rows
    outputCols = selectCols.map(c => c.alias.replace(/[\w]+\./g, '').replace(/[()*, ]/g, '_').toUpperCase() || c.alias);
    
    for (const [, grpRows] of groups) {
      const resultRow: Row = {};
      selectCols.forEach((col, i) => {
        const outKey = outputCols[i];
        const aggM = col.expr.match(AGG_RE);
        if (aggM) {
          resultRow[outKey] = evalAgg(aggM[1].toUpperCase(), aggM[2], grpRows);
        } else {
          resultRow[outKey] = getValue(col.expr, grpRows[0] ?? {});
        }
      });
      resultRows.push(resultRow);
    }
  } else {
    // Simple SELECT projection
    if (selectRaw.trim() === '*') {
      // Get all non-dotted keys
      const allKeys = rows.length > 0 ? Object.keys(rows[0]).filter(k => !k.includes('.')) : [];
      outputCols = allKeys.map(k => k.toUpperCase());
      resultRows = rows.map(r => {
        const out: Row = {};
        allKeys.forEach((k, i) => { out[outputCols[i]] = r[k]; });
        return out;
      });
    } else {
      outputCols = selectCols.map(c => {
        // Clean alias: strip table prefix, make uppercase
        return c.alias.replace(/^\w+\./, '').toUpperCase();
      });
      resultRows = rows.map(r => {
        const out: Row = {};
        selectCols.forEach((col, i) => {
          out[outputCols[i]] = getValue(col.expr, r);
        });
        return out;
      });

      // DISTINCT
      if (distinct) {
        const seen = new Set<string>();
        resultRows = resultRows.filter(r => {
          const key = JSON.stringify(r);
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
      }
    }
  }

  // ── HAVING ────────────────────────────────────────────────────────────────
  if (clauseMap['HAVING']) {
    resultRows = resultRows.filter(r => {
      try { return evalCond(clauseMap['HAVING']!, r); }
      catch { return true; }
    });
  }

  // ── ORDER BY ──────────────────────────────────────────────────────────────
  if (clauseMap['ORDER BY']) {
    const orderParts = clauseMap['ORDER BY'].split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      return { col: parts[0].replace(/^\w+\./, '').toUpperCase(), dir: (parts[1] ?? 'ASC').toUpperCase() };
    });
    resultRows.sort((a, b) => {
      for (const { col, dir } of orderParts) {
        const av = a[col] ?? 0, bv = b[col] ?? 0;
        const cmp = (typeof av === 'number' && typeof bv === 'number')
          ? av - bv
          : String(av).localeCompare(String(bv));
        if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  // ── LIMIT ─────────────────────────────────────────────────────────────────
  if (clauseMap['LIMIT']) {
    const n = parseInt(clauseMap['LIMIT']);
    if (!isNaN(n)) resultRows = resultRows.slice(0, n);
  }

  // ── Build output ──────────────────────────────────────────────────────────
  const columns = outputCols;
  const rowData = resultRows.map(r => columns.map(col => r[col] !== undefined ? r[col] : null));
  return { columns, rows: rowData };
}
