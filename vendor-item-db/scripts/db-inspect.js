/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg")
const fs = require("fs")

function loadDatabaseUrl() {
  const env = fs.readFileSync(".env", "utf8")
  const match = env.match(/^DATABASE_URL="([^"]+)"/m)
  if (!match) throw new Error("DATABASE_URL not found in .env")
  return match[1]
}

async function main() {
  const client = new Client({ connectionString: loadDatabaseUrl() })
  await client.connect()

  const columns = await client.query(`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = current_schema()
      and table_name in (
        'equipments',
        'design_prices',
        'execution_prices',
        'evaluation_scores',
        'attachments',
        'vendors'
      )
    order by table_name, ordinal_position
  `)
  console.table(columns.rows)

  const counts = await client.query(`
    select 'vendors' table_name, count(*)::int count from vendors
    union all select 'equipments', count(*)::int from equipments
    union all select 'vendor_items', count(*)::int from vendor_items
    union all select 'design_prices', count(*)::int from design_prices
    union all select 'execution_prices', count(*)::int from execution_prices
    union all select 'vendor_evaluations', count(*)::int from vendor_evaluations
    union all select 'evaluation_scores', count(*)::int from evaluation_scores
    union all select 'equipment_categories', count(*)::int from equipment_categories
    union all select 'excel_uploads', count(*)::int from excel_uploads
    union all select 'upload_error_rows', count(*)::int from upload_error_rows
    order by table_name
  `)
  console.table(counts.rows)

  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
