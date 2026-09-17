import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { Database } from "@/server/db";
import { user as userTable } from "@/server/db/schemas/auth";
import { decrypt, encrypt } from "@/server/lib/crypto";
import type {
  DriverOutput,
  ListDriversInput,
  User,
  UserRole,
  UserWithDeletedAt,
} from "./drivers.types";

export class DriversRepository {
  constructor(private readonly db: Database) {}

  async create(input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    document: string;
    role: UserRole;
  }) {
    const encryptedDocument = encrypt(input.document);

    const createdUser = await auth.api.createUser({
      body: {
        name: input.name,
        email: input.email.toLowerCase(),
        password: input.password,
      },
    });

    if (!createdUser.user) {
      throw new Error("Failed to create user via auth API");
    }

    const [row] = await this.db
      .update(userTable)
      .set({
        phone: input.phone,
        document: encryptedDocument,
        role: input.role,
      })
      .where(eq(userTable.id, createdUser.user.id))
      .returning();

    return row ? this.toDomainWithDecryptedDocument(row) : null;
  }

  async findById(id: User["id"]) {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .limit(1);
    return row ? this.toDomainWithDecryptedDocument(row) : null;
  }

  async findByIdIncludingDeleted(
    id: User["id"],
  ): Promise<UserWithDeletedAt | null> {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return row ? this.toDomainWithDeletedAt(row) : null;
  }

  private toDomainWithDeletedAt(
    row: typeof userTable.$inferSelect,
  ): UserWithDeletedAt {
    return {
      ...row,
      document: row.document ? decrypt(row.document) : null,
      deletedAt: row.deletedAt,
    };
  }

  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(
        and(
          sql`lower(${userTable.email}) = ${email.toLowerCase()}`,
          isNull(userTable.deletedAt),
        ),
      )
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async list(input: ListDriversInput) {
    const where = and(
      isNull(userTable.deletedAt),
      input.role ? eq(userTable.role, input.role) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(userTable)
        .where(where)
        .orderBy(desc(userTable.createdAt))
        .limit(input.limit)
        .offset(input.offset),
      this.db.select({ total: count() }).from(userTable).where(where),
    ]);

    return {
      drivers: rows.map(this.toDomainWithDecryptedDocument),
      total,
    };
  }

  async update(
    id: User["id"],
    input: Partial<Pick<User, "name" | "phone" | "document">>,
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name) updates.name = input.name;
    if (input.phone) updates.phone = input.phone;
    if (input.document) updates.document = encrypt(input.document);
    if (Object.keys(updates).length === 0) return null;

    updates.updatedAt = new Date();

    const [row] = await this.db
      .update(userTable)
      .set(updates)
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning();
    return row ? this.toDomainWithDecryptedDocument(row) : null;
  }

  async softDelete(id: User["id"]) {
    const [row] = await this.db
      .update(userTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async restore(id: User["id"]) {
    const [row] = await this.db
      .update(userTable)
      .set({ deletedAt: null })
      .where(and(eq(userTable.id, id), sql`${userTable.deletedAt} IS NOT NULL`))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: typeof userTable.$inferSelect): User {
    return {
      ...row,
      document: row.document,
    };
  }

  private toDomainWithDecryptedDocument(
    row: typeof userTable.$inferSelect,
  ): DriverOutput {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      document: row.document ? decrypt(row.document) : null,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
