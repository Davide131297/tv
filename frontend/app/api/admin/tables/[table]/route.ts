import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ADMIN_TABLES, isAdminTable } from "@/lib/admin-schema";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
}

function invalidTableResponse() {
  return NextResponse.json({ error: "Unbekannte Tabelle." }, { status: 404 });
}

async function fetchAllRows(tableName: string, primaryKey: string) {
  const batchSize = 1000;
  let from = 0;
  let rows: JsonRecord[] = [];
  let totalCount = 0;

  while (true) {
    const { data, error, count } = await supabaseAdmin
      .from(tableName)
      .select("*", { count: from === 0 ? "exact" : undefined })
      .order(primaryKey, { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) {
      throw error;
    }

    if (from === 0) {
      totalCount = count || 0;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows = rows.concat(data as JsonRecord[]);

    if (data.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  return { rows, totalCount };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ table: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { table } = await context.params;

  if (!isAdminTable(table)) {
    return invalidTableResponse();
  }

  try {
    const config = ADMIN_TABLES[table];
    const { rows, totalCount } = await fetchAllRows(table, config.primaryKey);
    const columns = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row))),
    );

    return NextResponse.json({
      table,
      totalCount,
      columns,
      rows,
    });
  } catch (error) {
    console.error(`Admin GET ${table} error:`, error);
    return NextResponse.json(
      { error: "Tabelle konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { table } = await context.params;

  if (!isAdminTable(table)) {
    return invalidTableResponse();
  }

  try {
    const { record } = (await request.json()) as { record?: JsonRecord };

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return NextResponse.json(
        { error: "Ungültiger Datensatz." },
        { status: 400 },
      );
    }

    const tableClient = supabaseAdmin.from(table) as any;
    const { data, error } = await tableClient
      .insert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ record: data });
  } catch (error) {
    console.error(`Admin POST ${table} error:`, error);
    return NextResponse.json(
      { error: "Datensatz konnte nicht angelegt werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { table } = await context.params;

  if (!isAdminTable(table)) {
    return invalidTableResponse();
  }

  try {
    const { record } = (await request.json()) as { record?: JsonRecord };
    const primaryKey = ADMIN_TABLES[table].primaryKey;
    const primaryKeyValue = record?.[primaryKey];

    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      primaryKeyValue === undefined ||
      primaryKeyValue === null
    ) {
      return NextResponse.json(
        { error: "Primärschlüssel fehlt im Datensatz." },
        { status: 400 },
      );
    }

    const { [primaryKey]: _ignored, ...updates } = record;

    const tableClient = supabaseAdmin.from(table) as any;
    const { data, error } = await tableClient
      .update(updates)
      .eq(primaryKey, primaryKeyValue)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ record: data });
  } catch (error) {
    console.error(`Admin PATCH ${table} error:`, error);
    return NextResponse.json(
      { error: "Datensatz konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { table } = await context.params;

  if (!isAdminTable(table)) {
    return invalidTableResponse();
  }

  try {
    const { id } = (await request.json()) as { id?: string | number };
    const primaryKey = ADMIN_TABLES[table].primaryKey;

    if (id === undefined || id === null || id === "") {
      return NextResponse.json(
        { error: "Primärschlüssel fehlt." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq(primaryKey, id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Admin DELETE ${table} error:`, error);
    return NextResponse.json(
      { error: "Datensatz konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
