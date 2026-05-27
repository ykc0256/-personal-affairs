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

  try {
    await client.query("begin")

    await client.query(`
      alter table equipments
        add column if not exists model_name varchar(200),
        add column if not exists manufacturer_model_no varchar(100)
    `)

    for (const table of ["design_prices", "execution_prices"]) {
      await client.query(`
        alter table ${table}
          add column if not exists updated_at timestamptz default now(),
          add column if not exists updated_by uuid,
          add column if not exists is_voided boolean not null default false,
          add column if not exists void_reason text
      `)
      await client.query(`
        alter table ${table}
          add constraint ${table}_updated_by_fkey
          foreign key (updated_by) references users(user_id)
          not valid
      `).catch((error) => {
        if (!String(error.message).includes("already exists")) throw error
      })
    }

    await client.query(`
      alter table evaluation_scores
        add column if not exists updated_at timestamptz default now(),
        add column if not exists updated_by uuid
    `)
    await client.query(`
      alter table evaluation_scores
        add constraint evaluation_scores_updated_by_fkey
        foreign key (updated_by) references users(user_id)
        not valid
    `).catch((error) => {
      if (!String(error.message).includes("already exists")) throw error
    })

    await client.query(`
      update equipments
      set
        model_name = coalesce(model_name, equipment_name),
        manufacturer_model_no = coalesce(manufacturer_model_no, equipment_code)
      where model_name is null or manufacturer_model_no is null
    `)

    const admin = await client.query(`
      select user_id from users
      where role = 'admin' and is_active = true
      order by created_at
      limit 1
    `)
    const adminId = admin.rows[0]?.user_id ?? null

    const category = await client.query(`
      select category_id
      from equipment_categories
      where is_active = true
      order by depth desc, sort_order, category_name
      limit 1
    `)
    const categoryId = category.rows[0]?.category_id ?? null

    if (categoryId) {
      await client.query(
        `
        insert into equipments (
          category_id,
          equipment_code,
          equipment_name,
          model_name,
          manufacturer_model_no,
          specification,
          unit,
          notes,
          created_by,
          updated_by
        )
        values (
          $1,
          'SAMPLE_NO_PRICE_001',
          '샘플 단가 미등록 기자재',
          'NO-PRICE-PUMP-001',
          'NP-001',
          '단가 미등록 대시보드 테스트용 / DN65 / 3.7kW',
          'EA',
          '업무 판단용 대시보드 테스트 샘플',
          $2,
          $2
        )
        on conflict (equipment_code) do update
        set
          model_name = excluded.model_name,
          manufacturer_model_no = excluded.manufacturer_model_no,
          specification = excluded.specification,
          notes = excluded.notes,
          updated_at = now()
        `,
        [categoryId, adminId]
      )
    }

    const vendorItem = await client.query(`
      select vendor_id, equipment_id
      from vendor_items
      where is_active = true
      order by created_at
      limit 1
    `)

    if (vendorItem.rows[0]) {
      await client.query(
        `
        insert into design_prices (
          vendor_id,
          equipment_id,
          price,
          currency,
          price_date,
          source,
          created_by,
          updated_by
        )
        select $1, $2, 1234567, 'KRW', current_date - interval '10 days', null, $3, $3
        where not exists (
          select 1
          from design_prices
          where vendor_id = $1
            and equipment_id = $2
            and source is null
            and price = 1234567
        )
        `,
        [vendorItem.rows[0].vendor_id, vendorItem.rows[0].equipment_id, adminId]
      )

      await client.query(
        `
        insert into execution_prices (
          vendor_id,
          equipment_id,
          price,
          currency,
          price_date,
          source,
          created_by,
          updated_by,
          is_voided,
          void_reason
        )
        select $1, $2, 9999999, 'KRW', current_date - interval '20 days', '오입력 정정 샘플', $3, $3, true, '대시보드 테스트용 무효 단가'
        where not exists (
          select 1
          from execution_prices
          where vendor_id = $1
            and equipment_id = $2
            and is_voided = true
            and void_reason = '대시보드 테스트용 무효 단가'
        )
        `,
        [vendorItem.rows[0].vendor_id, vendorItem.rows[0].equipment_id, adminId]
      )
    }

    await client.query("commit")
    console.log("DB upgrade and sample data completed.")
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
