import { Pool } from 'pg'

if (!process.env.POSTGRES_PASSWORD) {
  throw new Error('POSTGRES_PASSWORD est requis')
}

export const pool = new Pool({
  host:     process.env.POSTGRES_HOST     ?? 'postgres',
  port:     Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB       ?? 'garminia',
  user:     process.env.POSTGRES_USER     ?? 'garminia',
  password: process.env.POSTGRES_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any
type DbResult<T> = { data: T | null; error: Error | null }
type OrderOpts  = { ascending?: boolean }
type UpsertOpts = { onConflict?: string }
type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete'

// Thin query builder compatible avec l'API Supabase client
class QB<T extends Row = Row> {
  private _table: string
  private _op: Op = 'select'
  private _fields = '*'
  private _returning: string | null = null
  private _conditions: { field: string; op: string; value: unknown }[] = []
  private _inConditions: { field: string; values: unknown[] }[] = []
  private _orderField?: string
  private _orderAsc = true
  private _limitN?: number
  private _singleRow = false
  private _insertData?: Row | Row[]
  private _upsertOpts?: UpsertOpts
  private _updateData?: Partial<Row>

  constructor(table: string) { this._table = table }

  select(fields: string): this {
    if (this._op === 'insert' || this._op === 'upsert') {
      this._returning = fields
    } else {
      this._op = 'select'
      this._fields = fields
    }
    return this
  }

  insert(data: Partial<T> | Partial<T>[]): this {
    this._op = 'insert'
    this._insertData = data as Row | Row[]
    return this
  }

  upsert(data: Partial<T> | Partial<T>[], opts?: UpsertOpts): this {
    this._op = 'upsert'
    this._insertData = data as Row | Row[]
    this._upsertOpts = opts
    return this
  }

  update(data: Partial<T>): this {
    this._op = 'update'
    this._updateData = data as Partial<Row>
    return this
  }

  delete(): this { this._op = 'delete'; return this }

  eq(field: string, value: unknown): this { this._conditions.push({ field, op: '=', value }); return this }
  neq(field: string, value: unknown): this { this._conditions.push({ field, op: '!=', value }); return this }
  gte(field: string, value: unknown): this { this._conditions.push({ field, op: '>=', value }); return this }
  lte(field: string, value: unknown): this { this._conditions.push({ field, op: '<=', value }); return this }

  in(field: string, values: unknown[]): this {
    this._inConditions.push({ field, values })
    return this
  }

  order(field: string, opts?: OrderOpts): this {
    this._orderField = field
    this._orderAsc = opts?.ascending ?? true
    return this
  }

  limit(n: number): this { this._limitN = n; return this }

  single(): this { this._singleRow = true; this._limitN = 1; return this }

  private buildWhere(startIdx = 1): { clause: string; values: unknown[] } {
    const values: unknown[] = []
    const parts: string[] = []

    for (const c of this._conditions) {
      values.push(c.value)
      parts.push(`"${c.field}" ${c.op} $${startIdx + values.length - 1}`)
    }

    for (const inc of this._inConditions) {
      if (inc.values.length === 0) { parts.push('FALSE'); continue }
      const placeholders = inc.values.map((v) => {
        values.push(v)
        return `$${startIdx + values.length - 1}`
      })
      parts.push(`"${inc.field}" IN (${placeholders.join(', ')})`)
    }

    return {
      clause: parts.length ? `WHERE ${parts.join(' AND ')}` : '',
      values,
    }
  }

  private async runSelect(): Promise<DbResult<T | T[]>> {
    const { clause, values } = this.buildWhere()
    let sql = `SELECT ${this._fields} FROM "${this._table}" ${clause}`
    if (this._orderField) sql += ` ORDER BY "${this._orderField}" ${this._orderAsc ? 'ASC' : 'DESC'}`
    if (this._limitN !== undefined) sql += ` LIMIT ${this._limitN}`
    try {
      const res = await pool.query(sql, values)
      if (this._singleRow) return { data: (res.rows[0] ?? null) as T, error: null }
      return { data: res.rows as T[], error: null }
    } catch (err) { return { data: null, error: err as Error } }
  }

  private async runInsert(): Promise<DbResult<T | T[]>> {
    const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData!]
    if (rows.length === 0) return { data: null, error: null }

    const keys = Object.keys(rows[0])
    const cols = keys.map(k => `"${k}"`).join(', ')
    const valueSets: unknown[] = []
    const placeholders = rows.map(row => {
      const ph = keys.map(k => { valueSets.push(row[k]); return `$${valueSets.length}` })
      return `(${ph.join(', ')})`
    }).join(', ')

    let sql = `INSERT INTO "${this._table}" (${cols}) VALUES ${placeholders}`
    if (this._returning) sql += ` RETURNING ${this._returning}`

    try {
      const res = await pool.query(sql, valueSets)
      if (this._returning) {
        const data = this._singleRow ? (res.rows[0] ?? null) : res.rows
        return { data: data as T, error: null }
      }
      return { data: null, error: null }
    } catch (err) { return { data: null, error: err as Error } }
  }

  private async runUpsert(): Promise<DbResult<T | T[]>> {
    const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData!]
    if (rows.length === 0) return { data: null, error: null }

    const conflict = this._upsertOpts?.onConflict

    try {
      for (const row of rows) {
        const keys = Object.keys(row)
        const cols = keys.map(k => `"${k}"`).join(', ')
        const vals = keys.map((_k, i) => `$${i + 1}`)
        const updates = keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')
        const onConflict = conflict
          ? `ON CONFLICT (${conflict.split(',').map(c => `"${c.trim()}"`).join(', ')}) DO UPDATE SET ${updates}`
          : 'ON CONFLICT DO NOTHING'
        await pool.query(
          `INSERT INTO "${this._table}" (${cols}) VALUES (${vals.join(', ')}) ${onConflict}`,
          keys.map(k => row[k]),
        )
      }
      return { data: null, error: null }
    } catch (err) { return { data: null, error: err as Error } }
  }

  private async runUpdate(): Promise<DbResult<T>> {
    const data = this._updateData!
    const keys = Object.keys(data)
    const vals: unknown[] = keys.map(k => data[k])
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
    const { clause, values: whereVals } = this.buildWhere(keys.length + 1)
    const sql = `UPDATE "${this._table}" SET ${setClause} ${clause}`
    try {
      await pool.query(sql, [...vals, ...whereVals])
      return { data: null, error: null }
    } catch (err) { return { data: null, error: err as Error } }
  }

  private async runDelete(): Promise<DbResult<T>> {
    const { clause, values } = this.buildWhere()
    try {
      await pool.query(`DELETE FROM "${this._table}" ${clause}`, values)
      return { data: null, error: null }
    } catch (err) { return { data: null, error: err as Error } }
  }

  execute(): Promise<DbResult<T | T[]>> {
    switch (this._op) {
      case 'select': return this.runSelect()
      case 'insert': return this.runInsert()
      case 'upsert': return this.runUpsert()
      case 'update': return this.runUpdate()
      case 'delete': return this.runDelete()
    }
  }

  then<R>(
    resolve?: ((v: DbResult<T | T[]>) => R | PromiseLike<R>) | null,
    reject?: ((e: unknown) => R | PromiseLike<R>) | null,
  ): Promise<R> {
    return this.execute().then(resolve as never, reject as never)
  }
}

export const db = {
  from<T extends Row = Row>(table: string): QB<T> {
    return new QB<T>(table)
  },
}
